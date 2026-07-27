from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload

from app.db import get_db
from app.dependencies import verify_api_key
from app.models import Run, Span

router = APIRouter(tags=["compare"], dependencies=[Depends(verify_api_key)])


def _span_to_dict(span: Span) -> Dict[str, Any]:
    return {
        "id": span.id,
        "parent_span_id": span.parent_span_id,
        "span_type": span.span_type,
        "name": span.name,
        "status": span.status,
        "started_at": span.started_at.isoformat() if span.started_at else None,
        "ended_at": span.ended_at.isoformat() if span.ended_at else None,
        "duration_ms": span.duration_ms,
        "model_name": span.model_name,
        "tool_name": span.tool_name,
        "input_tokens": span.input_tokens,
        "output_tokens": span.output_tokens,
        "estimated_cost_usd": span.estimated_cost_usd,
        "prompt_version": span.prompt_version,
        "temperature": span.temperature,
        "input_payload": span.input_payload,
        "output_payload": span.output_payload,
        "retrieved_documents": [
            {
                "id": d.id,
                "source_name": d.source_name,
                "source_uri": d.source_uri,
                "score": d.score,
                "rank": d.rank,
                "content_snippet": d.content_snippet,
            }
            for d in (span.retrieved_documents or [])
        ],
        "artifacts": [
            {
                "id": a.id,
                "artifact_type": a.artifact_type,
                "filename": a.filename,
                "mime_type": a.mime_type,
                "storage_url": a.storage_url,
            }
            for a in (span.artifacts or [])
        ],
    }


def _run_summary(run: Run) -> Dict[str, Any]:
    total_tokens = (run.total_input_tokens or 0) + (run.total_output_tokens or 0)
    return {
        "run_id": run.id,
        "status": run.status,
        "duration_ms": run.duration_ms,
        "failure_type": run.failure_type,
        "severity": run.severity,
        "estimated_cost_usd": run.estimated_cost_usd,
        "total_tokens": total_tokens,
        "total_input_tokens": run.total_input_tokens,
        "total_output_tokens": run.total_output_tokens,
        "final_output": run.final_output,
        "user_query": run.user_query,
    }


@router.get("/runs/{run_id}/compare/{other_run_id}")
def compare_runs(run_id: str, other_run_id: str, db: Session = Depends(get_db)):
    run_a = (
        db.query(Run)
        .filter(Run.id == run_id)
        .options(
            selectinload(Run.spans).selectinload(Span.retrieved_documents),
            selectinload(Run.spans).selectinload(Span.artifacts),
        )
        .first()
    )
    run_b = (
        db.query(Run)
        .filter(Run.id == other_run_id)
        .options(
            selectinload(Run.spans).selectinload(Span.retrieved_documents),
            selectinload(Run.spans).selectinload(Span.artifacts),
        )
        .first()
    )

    if not run_a or not run_b:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run not found")

    diffs: List[Dict[str, Any]] = []

    # Output diff
    if run_a.final_output != run_b.final_output:
        diffs.append(
            {
                "type": "output_divergence",
                "left_output": run_a.final_output,
                "right_output": run_b.final_output,
                "reason": "Final output differs",
            }
        )

    # Align spans by order, pairing by name/type if possible
    span_a = list(run_a.spans)
    span_b = list(run_b.spans)

    span_pairs: List[Dict[str, Any]] = []
    a_index = 0
    b_index = 0

    while a_index < len(span_a) or b_index < len(span_b):
        a = span_a[a_index] if a_index < len(span_a) else None
        b = span_b[b_index] if b_index < len(span_b) else None

        if a and b and a.name == b.name and a.span_type == b.span_type:
            divergences: List[str] = []
            if a.status != b.status:
                divergences.append("status")
            if a.duration_ms != b.duration_ms:
                divergences.append("duration")
            if a.output_payload != b.output_payload:
                divergences.append("output")
            if a.retrieved_documents != b.retrieved_documents:
                divergences.append("retrieved_documents")

            span_pairs.append(
                {
                    "match_state": "both",
                    "divergences": divergences,
                    "left": _span_to_dict(a),
                    "right": _span_to_dict(b),
                }
            )
            a_index += 1
            b_index += 1
        elif a:
            span_pairs.append(
                {
                    "match_state": "left_only",
                    "divergences": ["left_only"],
                    "left": _span_to_dict(a),
                    "right": None,
                }
            )
            a_index += 1
        else:
            span_pairs.append(
                {
                    "match_state": "right_only",
                    "divergences": ["right_only"],
                    "left": None,
                    "right": _span_to_dict(b),
                }
            )
            b_index += 1

    # Global span sequence diff
    if len(span_a) != len(span_b) or any(
        a.name != b.name or a.span_type != b.span_type
        for a, b in zip(span_a, span_b)
    ):
        diffs.append(
            {
                "type": "span_divergence",
                "reason": "Span sequences differ",
                "left_span_count": len(span_a),
                "right_span_count": len(span_b),
            }
        )

    return {
        "left_run_id": run_id,
        "right_run_id": other_run_id,
        "left": _run_summary(run_a),
        "right": _run_summary(run_b),
        "left_status": run_a.status,
        "right_status": run_b.status,
        "left_duration_ms": run_a.duration_ms,
        "right_duration_ms": run_b.duration_ms,
        "divergences": diffs,
        "span_pairs": span_pairs,
    }
