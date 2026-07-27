"""Heuristic and LLM-based run analysis service."""

from typing import Any, Dict, List, Optional

from app.models import Run, Span
from app.services.llm import LLMProvider


# Failure taxonomy aligned with the product spec.
FAILURE_TAXONOMY = {
    "stale_source": "Retrieved source data is outdated or stale.",
    "wrong_tool": "The agent selected the wrong tool.",
    "wrong_tool_args": "The agent passed incorrect arguments to a tool.",
    "formatting": "The output failed to parse or had formatting errors.",
    "timeout": "A step timed out or took too long.",
    "policy_refusal": "The model refused the request for policy reasons.",
    "hallucination": "The answer contained fabricated information.",
    "missing_escalation": "The agent should have escalated to a human.",
    "retrieval_mismatch": "Retrieved documents did not match the query intent.",
    "unknown": "Unable to determine a specific failure type.",
}


def _span_text(span: Span) -> str:
    parts = []
    if span.name:
        parts.append(span.name)
    if span.tool_name:
        parts.append(f"tool={span.tool_name}")
    if span.model_name:
        parts.append(f"model={span.model_name}")
    if span.status:
        parts.append(f"status={span.status}")
    return " ".join(parts)


def suggest_failure_type(run: Run) -> str:
    """Heuristic root-cause analysis for a run."""
    if run.status != "failure":
        return "none"

    output_text = str(run.final_output or "").lower()
    user_query = str(run.user_query or "").lower()

    # 1. Formatting errors
    if "json" in output_text and ("error" in output_text or "invalid" in output_text):
        return "formatting"

    # 2. Timeout / retry signals
    for span in run.spans:
        if span.status == "error" and (span.duration_ms or 0) > 5000:
            return "timeout"

    # 3. Stale source / retrieval quality
    stale_keywords = ["2023", "old policy", "previous", "outdated", "deprecated"]
    retrieval_spans = [s for s in run.spans if s.span_type in ("retrieval", "retrieve")]
    for span in retrieval_spans:
        source_name = str((span.output_payload or {}).get("source_name", "")).lower()
        if any(k in source_name for k in stale_keywords):
            return "stale_source"
        if "policy-2023" in source_name:
            return "stale_source"

    # 4. Wrong tool
    tool_spans = [s for s in run.spans if s.span_type in ("tool_call", "tool")]
    if tool_spans:
        # If a known wrong-tool pattern is present in tool args/names.
        for span in tool_spans:
            name = str(span.tool_name or "").lower()
            if "wrong" in name or "invalid" in name:
                return "wrong_tool"
            args = str(span.input_payload or "").lower()
            if "wrong" in args:
                return "wrong_tool_args"

    # 5. Policy refusal
    refusal_keywords = ["i cannot", "i'm sorry", "policy prohibits", "cannot provide", "not allowed"]
    if any(k in output_text for k in refusal_keywords):
        return "policy_refusal"

    # 6. Hallucination / fabrication signals
    if "refund" in user_query and "policy" not in output_text and run.final_output:
        # crude heuristic: support policy questions without policy reference
        return "hallucination"

    # 7. Missing escalation
    escalation_keywords = ["escalate", "human", "support ticket", "contact support"]
    if any(k in user_query for k in escalation_keywords):
        return "missing_escalation"

    return "unknown"


def _build_run_context(run: Run) -> str:
    span_lines = ["Spans:"]
    for span in run.spans:
        span_lines.append(f"- {span.name} ({span.span_type}, {span.status})")
    return f"""User query: {run.user_query or "N/A"}
Run status: {run.status}
Failure type: {run.failure_type or "N/A"}
Final output: {run.final_output or "N/A"}
Suggested failure type: {run.suggested_failure_type or "N/A"}
{chr(10).join(span_lines)}"""


def summarize_run(run: Run, provider: LLMProvider) -> Dict[str, Optional[str]]:
    """Generate a one-sentence summary, failure explanation, and patch suggestion."""
    ctx = _build_run_context(run)

    summary_prompt = (
        "Summarize what the following AI agent run attempted to do in one sentence. "
        "Be concise and specific.\n\n" + ctx
    )
    summary = provider.complete(messages=[{"role": "user", "content": summary_prompt}]).get("content", "").strip()

    failure_explanation = None
    patch_suggestion = None

    if run.status == "failure":
        failure_prompt = (
            "Explain in one sentence why this AI agent run failed. "
            "Use the suggested failure type if available.\n\n" + ctx
        )
        failure_explanation = provider.complete(
            messages=[{"role": "user", "content": failure_prompt}]
        ).get("content", "").strip()

        patch_prompt = (
            "Suggest one concrete developer-facing patch that would likely fix this failure. "
            "Be specific and actionable.\n\n" + ctx
        )
        patch_suggestion = provider.complete(
            messages=[{"role": "user", "content": patch_prompt}]
        ).get("content", "").strip()

    return {
        "summary": summary,
        "failure_explanation": failure_explanation or None,
        "patch_suggestion": patch_suggestion or None,
    }
