"""Core replay execution logic.

This module is intentionally decoupled from FastAPI so it can be invoked both
from the HTTP endpoint and from background Celery workers.
"""

import datetime
import os
from typing import Optional

from sqlalchemy.orm import Session

from app.db import aware_utc, utc_now
from app.models import RetrievedDocument, Run, Span
from app.services.llm import get_llm_provider


class ReplayError(ValueError):
    """Raised when a replay request is invalid or the target run is missing."""


def _clone_run_base(original: Run) -> Run:
    return Run(
        workflow_id=original.workflow_id,
        environment_id=original.environment_id,
        external_run_id=f"sim_{original.external_run_id or original.id}",
        status="running",
        user_query=original.user_query,
        final_output=None,
        failure_type=None,
        severity=None,
        requires_review=False,
        score=None,
        metadata_json=(original.metadata_json or {}) | {"replayed_from": original.id},
    )


def _clone_spans_metadata(db: Session, run_id: str, cloned_run_id: str) -> dict:
    original_spans = (
        db.query(Span).filter(Span.run_id == run_id).order_by(Span.started_at.asc()).all()
    )
    span_id_map = {}
    for span in original_spans:
        span_copy = Span(
            run_id=cloned_run_id,
            parent_span_id=None,
            span_type=span.span_type,
            name=span.name,
            status=span.status,
            started_at=span.started_at,
            ended_at=span.ended_at,
            duration_ms=span.duration_ms,
            model_name=span.model_name,
            tool_name=span.tool_name,
            input_tokens=span.input_tokens,
            output_tokens=span.output_tokens,
            estimated_cost_usd=span.estimated_cost_usd,
            prompt_version=span.prompt_version,
            temperature=span.temperature,
            input_payload=span.input_payload,
            output_payload=span.output_payload,
            metadata_json=(span.metadata_json or {}) | {"replayed_from": span.id},
        )
        db.add(span_copy)
        db.flush()
        span_id_map[span.id] = span_copy.id

    # Fix parent references
    for span in original_spans:
        if span.parent_span_id and span.parent_span_id in span_id_map:
            cloned_id = span_id_map[span.id]
            cloned_span = db.query(Span).filter(Span.id == cloned_id).first()
            if cloned_span:
                cloned_span.parent_span_id = span_id_map[span.parent_span_id]

    return {"span_count": len(original_spans), "span_id_map": span_id_map}


def _clone_retrieved_documents(db: Session, original_spans: list[Span], span_id_map: dict) -> None:
    for span in original_spans:
        if span.span_type != "retrieval":
            continue
        docs = db.query(RetrievedDocument).filter(RetrievedDocument.span_id == span.id).all()
        for doc in docs:
            db.add(
                RetrievedDocument(
                    span_id=span_id_map[span.id],
                    source_name=doc.source_name,
                    source_uri=doc.source_uri,
                    chunk_id=doc.chunk_id,
                    rank=doc.rank,
                    score=doc.score,
                    content_snippet=doc.content_snippet,
                    metadata_json=doc.metadata_json,
                )
            )


def _safe_eval(expression: str) -> float:
    """Evaluate a simple arithmetic expression safely.

    Only numbers, +, -, *, /, parentheses and whitespace are supported.
    """
    import ast
    import operator

    allowed_chars = set("0123456789+-*/(). ")
    if not expression or not all(c in allowed_chars for c in expression):
        raise ValueError("unsafe or empty expression")

    _ops = {
        ast.Add: operator.add,
        ast.Sub: operator.sub,
        ast.Mult: operator.mul,
        ast.Div: operator.truediv,
        ast.USub: operator.neg,
        ast.UAdd: operator.pos,
    }

    def _eval(node):
        if isinstance(node, ast.Constant):
            if not isinstance(node.value, (int, float)):
                raise ValueError("only numeric constants allowed")
            return node.value
        if isinstance(node, ast.BinOp):
            op_type = type(node.op)
            if op_type not in _ops:
                raise ValueError(f"unsupported operator: {op_type.__name__}")
            return _ops[op_type](_eval(node.left), _eval(node.right))
        if isinstance(node, ast.UnaryOp):
            op_type = type(node.op)
            if op_type not in _ops:
                raise ValueError(f"unsupported operator: {op_type.__name__}")
            return _ops[op_type](_eval(node.operand))
        if isinstance(node, ast.Expression):
            return _eval(node.body)
        raise ValueError("unsupported expression")

    tree = ast.parse(expression, mode="eval")
    return _eval(tree)


def _replay_tool(span: Span, new_span: Span) -> None:
    """Re-execute a tool_call span in full replay mode.

    Only read-only demo tools are supported when ALLOW_FULL_REPLAY is set.
    """
    if span.tool_name in ("calculator", "math"):
        args = span.input_payload or {}
        try:
            new_span.output_payload = {"result": _safe_eval(str(args.get("expression", "0")))}
        except Exception as exc:
            new_span.output_payload = {"error": str(exc)}
            new_span.status = "error"
    elif span.tool_name == "current_time":
        new_span.output_payload = {"iso": utc_now().isoformat()}
    else:
        # For any other tool, reuse the original output to avoid side effects.
        new_span.output_payload = span.output_payload


def execute_replay(
    db: Session,
    run_id: str,
    mode: str = "metadata",
    model_name: Optional[str] = None,
    temperature: Optional[float] = None,
) -> dict:
    """Clone a run and replay its execution.

    Supported modes:
        - metadata: exact clone of the original run/spans.
        - partial:  re-run model_call spans with the LLM; reuse tool/retrieval outputs.
        - full:     re-run model_call and read-only demo tool_call spans.

    Raises:
        ReplayError: if the mode is invalid or the run is missing.
    """
    allowed_modes = {"metadata", "partial", "full"}
    if mode not in allowed_modes:
        raise ReplayError(f"mode must be one of {allowed_modes}")

    if mode == "full" and os.getenv("ALLOW_FULL_REPLAY", "false").lower() != "true":
        raise ReplayError("full replay is disabled")

    original = db.query(Run).filter(Run.id == run_id).first()
    if not original:
        raise ReplayError("Run not found")

    if mode == "metadata":
        cloned = Run(
            workflow_id=original.workflow_id,
            environment_id=original.environment_id,
            external_run_id=f"sim_{original.external_run_id or original.id}",
            status=original.status,
            ended_at=original.ended_at,
            duration_ms=original.duration_ms,
            total_input_tokens=original.total_input_tokens,
            total_output_tokens=original.total_output_tokens,
            estimated_cost_usd=original.estimated_cost_usd,
            user_query=original.user_query,
            final_output=original.final_output,
            failure_type=original.failure_type,
            severity=original.severity,
            requires_review=False,
            score=original.score,
            metadata_json=(original.metadata_json or {}) | {"replayed_from": original.id},
        )
        db.add(cloned)
        db.flush()
        _clone_spans_metadata(db, run_id, cloned.id)
        db.commit()
        db.refresh(cloned)
        return {"new_run_id": cloned.id, "original_run_id": original.id, "mode": mode}

    # Partial or full replay: clone run metadata then replay spans.
    cloned = _clone_run_base(original)
    db.add(cloned)
    db.flush()

    provider = get_llm_provider()
    original_spans = (
        db.query(Span).filter(Span.run_id == run_id).order_by(Span.started_at.asc()).all()
    )
    span_id_map: dict[str, str] = {}
    total_input_tokens = 0
    total_output_tokens = 0
    total_cost = 0.0
    has_error = False
    latest_model_output: dict | None = None

    for span in original_spans:
        started = utc_now()
        span_status = span.status if span.span_type not in ("model_call", "llm", "generation") else "ok"
        if span_status == "error":
            has_error = True
        new_span = Span(
            run_id=cloned.id,
            parent_span_id=None,
            span_type=span.span_type,
            name=span.name,
            status=span_status,
            started_at=started,
            model_name=model_name or span.model_name,
            tool_name=span.tool_name,
            prompt_version=span.prompt_version,
            temperature=temperature if temperature is not None else span.temperature,
            input_payload=span.input_payload,
            metadata_json=(span.metadata_json or {}) | {"replayed_from": span.id},
        )

        if span.span_type in ("model_call", "llm", "generation"):
            prompt = (span.input_payload or {}).get("prompt") or str(span.input_payload or "")
            try:
                result = provider.complete(
                    messages=[{"role": "user", "content": prompt}],
                    model=model_name or span.model_name,
                    temperature=temperature
                    if temperature is not None
                    else (span.temperature or 0.2),
                )
                output = {"answer": result.get("content", "")}
                new_span.output_payload = output
                latest_model_output = output
                usage = result.get("usage") or {}
                new_span.input_tokens = usage.get("prompt_tokens") or span.input_tokens
                new_span.output_tokens = usage.get("completion_tokens") or span.output_tokens
                new_span.estimated_cost_usd = span.estimated_cost_usd
            except Exception:
                new_span.status = "error"
                new_span.output_payload = {"error": "LLM replay failed"}
                new_span.input_tokens = span.input_tokens
                new_span.output_tokens = 0
                has_error = True
        elif mode == "full" and span.span_type == "tool_call":
            _replay_tool(span, new_span)
            new_span.input_tokens = span.input_tokens
            new_span.output_tokens = span.output_tokens
            new_span.estimated_cost_usd = span.estimated_cost_usd
        else:
            # Reuse tool/retrieval outputs.
            new_span.output_payload = span.output_payload
            new_span.input_tokens = span.input_tokens
            new_span.output_tokens = span.output_tokens
            new_span.estimated_cost_usd = span.estimated_cost_usd

        new_span.ended_at = utc_now()
        new_span.duration_ms = int((new_span.ended_at - started).total_seconds() * 1000)
        total_input_tokens += new_span.input_tokens or 0
        total_output_tokens += new_span.output_tokens or 0
        total_cost += new_span.estimated_cost_usd or 0.0

        db.add(new_span)
        db.flush()
        span_id_map[span.id] = new_span.id

    # Fix parent references and copy retrieved documents.
    for span in original_spans:
        if span.parent_span_id and span.parent_span_id in span_id_map:
            new_id = span_id_map[span.id]
            new_span = db.query(Span).filter(Span.id == new_id).first()
            if new_span:
                new_span.parent_span_id = span_id_map[span.parent_span_id]

    _clone_retrieved_documents(db, original_spans, span_id_map)

    cloned.status = "failure" if has_error else "success"
    cloned.ended_at = utc_now()
    if cloned.started_at:
        cloned.duration_ms = int((cloned.ended_at - aware_utc(cloned.started_at)).total_seconds() * 1000)
    cloned.total_input_tokens = total_input_tokens or None
    cloned.total_output_tokens = total_output_tokens or None
    cloned.estimated_cost_usd = total_cost or None
    cloned.final_output = latest_model_output or original.final_output
    cloned.metadata_json = (cloned.metadata_json or {}) | {"replay_mode": mode}

    db.commit()
    db.refresh(cloned)
    return {"new_run_id": cloned.id, "original_run_id": original.id, "mode": mode}
