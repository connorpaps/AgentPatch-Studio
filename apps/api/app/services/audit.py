"""Audit logging helpers."""

from sqlalchemy.orm import Session

from app.models import AuditLog


def log_audit_event(
    db: Session,
    actor: str,
    action: str,
    resource_type: str,
    resource_id: str,
    note: str | None = None,
    project_id: str | None = None,
) -> AuditLog:
    """Create and persist an AuditLog entry.

    The caller is responsible for committing the session after calling this
    helper so the audit record is written in the same transaction as the
    action being audited.
    """
    audit = AuditLog(
        actor=actor,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        note=note,
        project_id=project_id,
    )
    db.add(audit)
    return audit


def get_project_id_for_run(db: Session, run_id: str) -> str | None:
    """Return the project id for a run by joining Run -> Workflow -> Project."""
    from app.models import Project, Run, Workflow

    result = (
        db.query(Project.id)
        .join(Workflow, Workflow.project_id == Project.id)
        .join(Run, Run.workflow_id == Workflow.id)
        .filter(Run.id == run_id)
        .first()
    )
    return result[0] if result else None
