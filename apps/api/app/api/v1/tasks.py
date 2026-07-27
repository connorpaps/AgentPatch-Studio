"""Background task status endpoint (powered by Celery AsyncResult)."""

import os

from celery.result import AsyncResult
from fastapi import APIRouter, Depends, Query

from app.dependencies import verify_api_key

router = APIRouter(tags=["tasks"], dependencies=[Depends(verify_api_key)])


@router.get("/tasks")
def list_recent_tasks(limit: int = Query(20, ge=1, le=200)):
    """Return the most recent Celery results if we have them.

    We rely on the standard ``celery_app.AsyncResult`` interface so it works in
    both eager (test) and Redis-backed modes.
    """
    # Without a result backend meta store there's nothing to enumerate, so this
    # endpoint intentionally returns an empty list when ``Celery`` has nothing
    # to index back to (most setups).
    return []


@router.get("/tasks/{task_id}")
def get_task_status(task_id: str):
    """Return the live status of a previously enqueued task."""
    try:
        result = AsyncResult(task_id)
        payload: dict = {
            "task_id": task_id,
            "status": result.state,  # PENDING / STARTED / SUCCESS / FAILURE / REVOKED
            "ready": result.ready(),
        }
        if result.successful():
            payload["result"] = result.result
        elif result.failed():
            payload["error"] = str(result.result)
        elif result.state == "PENDING" and os.getenv("AGENTPATCH_USE_WORKER", "false").lower() != "true":
            payload["result"] = "synchronous (in-process) execution — no live task"
        return payload
    except Exception as exc:  # pragma: no cover - safety
        return {
            "task_id": task_id,
            "status": "UNKNOWN",
            "ready": False,
            "error": str(exc),
        }
