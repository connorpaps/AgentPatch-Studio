"""Project settings, listing, and audit-log endpoints."""

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db import get_db
from app.dependencies import (
    Principal,
    get_master_api_key,
    get_principal,
    require_session,
    verify_api_key,
)
from app.helpers import CAPTURE_MODES, get_current_project, serialize_project
from app.models import AuditLog, Project

router = APIRouter(tags=["projects"], dependencies=[Depends(verify_api_key)])


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    capture_mode: Optional[str] = Field(default=None)


@router.get("/projects")
def list_projects(db: Session = Depends(get_db)):
    """List all projects (used by the sidebar project switcher)."""
    rows = db.query(Project).order_by(Project.created_at.asc()).all()
    return [serialize_project(p, include_api_key=False) for p in rows]


@router.get("/projects/me")
def get_me(
    principal: Principal = Depends(get_principal),
    db: Session = Depends(get_db),
):
    """Return the active project, deliberately redacting the api_key for
    demo/anonymous principals -- otherwise any recruiter with the URL
    could copy the writable master key from the Settings page (or simply
    from any browser devtools session that minted a demo cookie)."""
    project = get_current_project(db, get_master_api_key())
    return serialize_project(project, include_api_key=not principal.is_demo)


@router.put("/projects/me")
def update_me(
    payload: ProjectUpdate,
    principal: Principal = Depends(get_principal),
    db: Session = Depends(get_db),
):
    # Demo + anonymous principals CANNOT mutate the shared project.
    # require_session rejects demo (403) and anonymous (401); only API-key
    # or real-session principals reach this branch.
    if principal.is_readonly:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This action requires a signed-in session, not the demo workspace.",
        )
    project = get_current_project(db, get_master_api_key())

    if payload.name is not None and payload.name.strip():
        project.name = payload.name.strip()

    if payload.capture_mode is not None:
        if payload.capture_mode not in CAPTURE_MODES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"capture_mode must be one of {sorted(CAPTURE_MODES)}",
            )
        project.capture_mode = payload.capture_mode

    db.commit()
    db.refresh(project)
    return serialize_project(project, include_api_key=not principal.is_demo)


@router.get("/projects/{project_id}/audit-logs")
def list_audit_logs(
    project_id: str,
    action: Optional[str] = Query(None, description="Filter by action"),
    resource_id: Optional[str] = Query(None, description="Filter by resource id"),
    limit: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db),
):
    query = db.query(AuditLog).filter(AuditLog.project_id == project_id)
    if action:
        query = query.filter(AuditLog.action == action)
    if resource_id:
        query = query.filter(AuditLog.resource_id == resource_id)
    rows = query.order_by(AuditLog.created_at.desc()).limit(limit).all()
    return [
        {
            "id": r.id,
            "project_id": r.project_id,
            "actor": r.actor,
            "action": r.action,
            "resource_type": r.resource_type,
            "resource_id": r.resource_id,
            "note": r.note,
            "created_at": r.created_at,
        }
        for r in rows
    ]
