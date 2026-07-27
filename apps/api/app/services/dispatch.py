"""Sync/async dispatch helpers for summarize and replay tasks.

Kept in ``app.services`` so the router code stays small.
"""

import os
import uuid
from typing import Any, Dict, Optional

from app.worker import replay_run_task, summarize_run_task


def use_worker() -> bool:
    return os.getenv("AGENTPATCH_USE_WORKER", "false").lower() == "true"


def dispatch_summarize(run_id: str) -> Dict[str, Any]:
    if use_worker():
        task_id = str(uuid.uuid4())
        summarize_run_task.apply_async(args=[run_id], task_id=task_id)
        return {"mode": "async", "task_id": task_id, "run_id": run_id}
    result = summarize_run_task.apply(args=[run_id]).get()
    return {"mode": "sync", "run_id": run_id, "result": result}


def dispatch_replay(
    run_id: str,
    mode: str,
    model_name: Optional[str] = None,
    temperature: Optional[float] = None,
) -> Dict[str, Any]:
    if use_worker():
        task_id = str(uuid.uuid4())
        replay_run_task.apply_async(
            args=[run_id, mode],
            kwargs={"model_name": model_name, "temperature": temperature},
            task_id=task_id,
        )
        # Don't echo request params; they are passed as kwargs, not result state.
        return {"mode": "async", "task_id": task_id, "run_id": run_id}
    result = replay_run_task.apply(
        args=[run_id, mode],
        kwargs={"model_name": model_name, "temperature": temperature},
    ).get()
    return {
        "mode": "sync",
        "run_id": run_id,
        "result": result,
        "model_name": model_name,
        "temperature": temperature,
    }
