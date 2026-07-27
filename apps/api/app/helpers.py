"""Shared helpers used by the API routers (sync/async dispatch, project lookup)."""

import os
import uuid
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from app.dependencies import get_master_api_key
from app.models import Project


def get_current_project(db: Session, api_key: str) -> Project:
    """Return the Project associated with an authorized API key.

    - With the master API key we lazily create a synthetic "Default" project so
      that callers always have something concrete to act on.
    - With a project-scoped key we return that project directly.
    """

    project = db.query(Project).filter(Project.api_key == api_key).first()
    if project:
        return project

    master = get_master_api_key()
    if api_key == master:
        project = Project(name="Default", slug="default", api_key=master)
        db.add(project)
        db.commit()
        db.refresh(project)
        return project

    raise LookupError("invalid api key")


def use_worker() -> bool:
    """Whether background tasks should be enqueued via Celery.

    Off by default so demos stay simple and offline. ``AGENTPATCH_USE_WORKER=true``
    flips it on and exercises the real Redis-backed queue (or eager execution
    in tests via ``AGENTPATCH_TASK_ALWAYS_EAGER=true``).
    """
    return os.getenv("AGENTPATCH_USE_WORKER", "false").lower() == "true"


def generate_task_id() -> str:
    return str(uuid.uuid4())


def serialize_project(project: Project, include_api_key: bool = True) -> Dict[str, Any]:
    return {
        "id": project.id,
        "name": project.name,
        "slug": project.slug,
        "capture_mode": project.capture_mode,
        "created_at": project.created_at,
        "api_key": project.api_key if include_api_key else None,
    }


CAPTURE_MODES = {"metadata_only", "redacted", "full"}
