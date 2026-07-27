"""Celery worker setup for background tasks.

This module exposes the Celery app instance and the task functions. Dispatch
helpers that gate between inline and queued execution live in
``app.services.dispatch`` so the API code stays clean.
"""

import datetime
import os
from typing import Optional

from celery import Celery

from app.db import utc_now

# Eager mode makes the queue run inline — invaluable for tests, demos, and
# offline environments where Redis isn't running.
_eager = os.getenv("AGENTPATCH_TASK_ALWAYS_EAGER", "false").lower() == "true"

celery_app = Celery(
    "agentpatch",
    broker=os.getenv("REDIS_URL", "redis://localhost:6379/0"),
    backend=os.getenv("REDIS_URL", "redis://localhost:6379/0"),
)
celery_app.conf.task_always_eager = _eager
celery_app.conf.task_eager_propagates = _eager


@celery_app.task(name="agentpatch.summarize_run")
def summarize_run_task(run_id: str):
    """Background task to summarize a run and suggest patch/root cause."""
    from app.models import Run
    from app.services.analysis import suggest_failure_type, summarize_run
    from app.services.llm import get_llm_provider

    from app.db import SessionLocal

    with SessionLocal() as db:
        run = db.query(Run).filter(Run.id == run_id).first()
        if not run:
            return {"error": "Run not found"}

        provider = get_llm_provider()
        try:
            result = summarize_run(run, provider)
        except Exception as exc:  # pragma: no cover - defensive
            return {"error": f"summarization failed: {exc}"}

        if not run.suggested_failure_type:
            run.suggested_failure_type = suggest_failure_type(run)
        run.summary = result["summary"]
        run.failure_explanation = result["failure_explanation"]
        run.patch_suggestion = result["patch_suggestion"]
        run.analyzed_at = utc_now()
        db.commit()
        return {"run_id": run_id, "status": "summarized"}


@celery_app.task(name="agentpatch.replay_run")
def replay_run_task(
    run_id: str,
    mode: str = "metadata",
    model_name: Optional[str] = None,
    temperature: Optional[float] = None,
):
    """Background task to replay a run."""
    from app.db import SessionLocal
    from app.services.replay import ReplayError, execute_replay

    with SessionLocal() as db:
        try:
            return execute_replay(
                db=db,
                run_id=run_id,
                mode=mode,
                model_name=model_name,
                temperature=temperature,
            )
        except ReplayError as exc:
            return {"error": str(exc)}


@celery_app.task(name="agentpatch.rerun_eval")
def rerun_eval_task(eval_case_id: str, options: dict):
    """Background task to rerun an eval case."""
    from app.db import SessionLocal
    from app.models import EvalCase, EvalResult
    from app.services.llm import get_llm_provider

    with SessionLocal() as db:
        eval_case = db.query(EvalCase).filter(EvalCase.id == eval_case_id).first()
        if not eval_case:
            return {"error": "Eval case not found"}

        provider = get_llm_provider()
        user_query = (eval_case.input_payload or {}).get("user_query", "")
        system_prompt = "You are a helpful support agent."
        if options.get("workflow_version"):
            system_prompt += f" Workflow version: {options['workflow_version']}."
        if options.get("prompt_version"):
            system_prompt += f" Prompt version: {options['prompt_version']}."

        answer = provider.complete(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_query},
            ],
            model=options.get("model_name"),
            temperature=options.get("temperature", 0.2),
        )
        generated = answer.get("content", "")
        gold = (eval_case.gold_output or {}).get("answer", "")
        passed = generated.strip().lower() == gold.strip().lower()

        result = EvalResult(
            eval_case_id=eval_case.id,
            workflow_version=options.get("workflow_version") or "v1",
            prompt_version=options.get("prompt_version"),
            model_name=options.get("model_name"),
            temperature=options.get("temperature"),
            run_id=eval_case.source_run_id,
            score=1.0 if passed else 0.0,
            passed=passed,
            judge_reason=f"Generated: {generated}; Expected: {gold}",
        )
        db.add(result)
        db.commit()
        return {"eval_result_id": result.id, "passed": passed}
