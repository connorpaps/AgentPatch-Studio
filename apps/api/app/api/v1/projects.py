"""Project settings, listing, and audit-log endpoints."""

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db import get_db
from app.dependencies import verify_api_key
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
def get_me(api_key: str = Depends(verify_api_key), db: Session = Depends(get_db)):
    project = get_current_project(db, api_key)
    return serialize_project(project)


@router.put("/projects/me")
def update_me(
    payload: ProjectUpdate,
    api_key: str = Depends(verify_api_key),
    db: Session = Depends(get_db),
):
    project = get_current_project(db, api_key)

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
    return serialize_project(project)


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
