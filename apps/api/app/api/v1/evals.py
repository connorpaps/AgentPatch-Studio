from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.dependencies import verify_api_key
from app.models import EvalCase, EvalResult, Run
from app.schemas import EvalRerunOptions
from app.services.llm import get_llm_provider

router = APIRouter(tags=["evals"], dependencies=[Depends(verify_api_key)])


@router.post("/evals/from-run/{run_id}")
def create_eval_from_run(run_id: str, db: Session = Depends(get_db)):
    run = db.query(Run).filter(Run.id == run_id).first()
    if not run:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run not found")

    eval_case = EvalCase(
        project_id=run.workflow.project_id,
        source_run_id=run.id,
        name=f"Eval from run {run.id[:8]}",
        description="Regression case generated from a production trace.",
        expected_behavior="Agent should answer correctly based on the latest policy documents.",
        input_payload=run.metadata_json or {"user_query": run.user_query},
        gold_output=run.final_output,
        tags=["regression", run.failure_type] if run.failure_type else ["regression"],
    )
    db.add(eval_case)
    db.commit()
    db.refresh(eval_case)
    return {"eval_case_id": eval_case.id}


@router.get("/evals")
def list_evals(db: Session = Depends(get_db)):
    cases = db.query(EvalCase).all()
    return [
        {
            "id": c.id,
            "project_id": c.project_id,
            "source_run_id": c.source_run_id,
            "name": c.name,
            "description": c.description,
            "expected_behavior": c.expected_behavior,
            "input_payload": c.input_payload,
            "gold_output": c.gold_output,
            "tags": c.tags,
        }
        for c in cases
    ]


@router.get("/evals/{eval_case_id}/results")
def list_eval_results(eval_case_id: str, db: Session = Depends(get_db)):
    eval_case = db.query(EvalCase).filter(EvalCase.id == eval_case_id).first()
    if not eval_case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Eval case not found")

    results = (
        db.query(EvalResult)
        .filter(EvalResult.eval_case_id == eval_case_id)
        .order_by(EvalResult.created_at.desc())
        .all()
    )
    return [
        {
            "id": r.id,
            "eval_case_id": r.eval_case_id,
            "workflow_version": r.workflow_version,
            "prompt_version": r.prompt_version,
            "model_name": r.model_name,
            "temperature": r.temperature,
            "run_id": r.run_id,
            "score": r.score,
            "passed": r.passed,
            "judge_reason": r.judge_reason,
            "created_at": r.created_at,
        }
        for r in results
    ]


@router.post("/evals/{eval_case_id}/rerun")
def rerun_eval(eval_case_id: str, options: EvalRerunOptions, db: Session = Depends(get_db)):
    eval_case = db.query(EvalCase).filter(EvalCase.id == eval_case_id).first()
    if not eval_case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Eval case not found")

    provider = get_llm_provider()
    user_query = (eval_case.input_payload or {}).get("user_query", "")

    # Build the system prompt from the eval case, injecting patch options if provided.
    system_prompt = "You are a helpful support agent."
    if options.workflow_version:
        system_prompt += f" Workflow version: {options.workflow_version}."
    if options.prompt_version:
        system_prompt += f" Prompt version: {options.prompt_version}."

    answer = provider.complete(
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_query},
        ],
        model=options.model_name,
        temperature=options.temperature if options.temperature is not None else 0.2,
    )

    generated = answer.get("content", "")
    gold = (eval_case.gold_output or {}).get("answer", "")
    generated_norm = generated.lower().strip()
    gold_norm = gold.lower().strip()
    passed = generated_norm == gold_norm or gold_norm in generated_norm or generated_norm in gold_norm

    result = EvalResult(
        eval_case_id=eval_case.id,
        workflow_version=options.workflow_version or "v1",
        prompt_version=options.prompt_version,
        model_name=options.model_name,
        temperature=options.temperature,
        run_id=eval_case.source_run_id,
        score=1.0 if passed else 0.0,
        passed=passed,
        judge_reason=f"Generated: {generated}; Expected: {gold}",
    )
    db.add(result)
    db.commit()
    db.refresh(result)
    return {
        "eval_result_id": result.id,
        "passed": result.passed,
        "score": result.score,
        "judge_reason": result.judge_reason,
    }
