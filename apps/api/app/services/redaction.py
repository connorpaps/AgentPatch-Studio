"""Content capture and redaction utilities."""

import re
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from app.models import Project, Run, Workflow


CAPTURE_MODES = {"metadata_only", "redacted", "full"}


def _mask_emails(text: str) -> str:
    return re.sub(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b", "[EMAIL]", text)


def _mask_phone(text: str) -> str:
    return re.sub(r"\b\d{3}[-.]?\d{3}[-.]?\d{4}\b", "[PHONE]", text)


def _mask_ssn(text: str) -> str:
    return re.sub(r"\b\d{3}-\d{2}-\d{4}\b", "[SSN]", text)


def apply_redaction(text: Optional[str]) -> str:
    if not text:
        return ""
    text = _mask_emails(text)
    text = _mask_phone(text)
    text = _mask_ssn(text)
    return text


def apply_capture_mode_to_text(text: Optional[str], mode: str) -> Optional[str]:
    """Apply the project capture mode to a string value."""
    if not text or mode == "full":
        return text
    if mode == "metadata_only":
        return "[REDACTED]"
    return apply_redaction(text)


def get_capture_mode_for_run(db: Session, run_id: str) -> str:
    """Resolve a run's project capture mode from Run -> Workflow -> Project."""
    res = (
        db.query(Project.capture_mode)
        .join(Workflow, Workflow.project_id == Project.id)
        .join(Run, Run.workflow_id == Workflow.id)
        .filter(Run.id == run_id)
        .first()
    )
    return res[0] if res else "full"


def apply_capture_mode(
    payload: Dict[str, Any],
    mode: str,
    input_fields: Optional[list] = None,
    output_fields: Optional[list] = None,
) -> Dict[str, Any]:
    """Apply project capture mode to a payload dictionary."""
    if mode not in CAPTURE_MODES:
        mode = "full"

    if mode == "full":
        return payload

    redacted = dict(payload)

    if mode == "metadata_only":
        # Keep only metadata keys; strip content.
        for field in input_fields or ["input", "input_payload"]:
            if field in redacted:
                redacted[field] = "[REDACTED]"
        for field in output_fields or ["output", "output_payload", "answer"]:
            if field in redacted:
                redacted[field] = "[REDACTED]"
        return redacted

    # mode == "redacted"
    for key, value in redacted.items():
        if isinstance(value, str):
            redacted[key] = apply_redaction(value)
    return redacted
