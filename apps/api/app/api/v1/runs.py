import datetime
import difflib
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload, selectinload

from app.db import aware_utc, get_db, utc_now
from app.dependencies import verify_api_key
from app.models import Annotation, Environment, Project, Run, Span, Workflow
from app.schemas import (
    AnnotationSummary,
    FeedbackCreate,
    RunDetail,
    RunEnd,
    RunStart,
    RunStartResponse,
    RunSummary,
)
from app.services.analysis import FAILURE_TAXONOMY, suggest_failure_type
from app.services.audit import get_project_id_for_run, log_audit_event
from app.services.dispatch import dispatch_summarize
from app.services.redaction import apply_capture_mode, apply_capture_mode_to_text, get_capture_mode_for_run

router = APIRouter(tags=["runs"], dependencies=[Depends(verify_api_key)])


def _get_or_create_project(db: Session, api_key: str) -> Project:
    project = db.query(Project).filter(Project.api_key == api_key).first()
    if not project:
        project = Project(name="Default", slug="default", api_key=api_key)
        db.add(project)
        db.commit()
        db.refresh(project)
    return project


def _get_or_create_environment(db: Session, project_id: str, name: str) -> Environment:
    env = db.query(Environment).filter_by(project_id=project_id, name=name).first()
    if not env:
        env = Environment(project_id=project_id, name=name)
        db.add(env)
        db.commit()
        db.refresh(env)
    return env


def _get_or_create_workflow(db: Session, project_id: str, name: str) -> Workflow:
    wf = db.query(Workflow).filter_by(project_id=project_id, name=name).first()
    if not wf:
        wf = Workflow(project_id=project_id, name=name)
        db.add(wf)
        db.commit()
        db.refresh(wf)
    return wf


@router.post("/runs/start", response_model=RunStartResponse)
def start_run(
    payload: RunStart,
    db: Session = Depends(get_db),
    api_key: str = Depends(verify_api_key),
):
    project = _get_or_create_project(db, api_key)
    environment = _get_or_create_environment(db, project.id, payload.environment)
    workflow = _get_or_create_workflow(db, project.id, payload.workflow_name)

    run = Run(
        workflow_id=workflow.id,
        environment_id=environment.id,
        external_run_id=payload.external_run_id,
        status="running",
        started_at=payload.started_at or utc_now(),
        user_query=apply_capture_mode_to_text((payload.input or {}).get("user_query"), project.capture_mode),
        metadata_json=payload.metadata,
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    return RunStartResponse(run_id=run.id, status=run.status)


@router.post("/runs/{run_id}/end")
def end_run(run_id: str, payload: RunEnd, db: Session = Depends(get_db)):
    run = db.query(Run).filter(Run.id == run_id).first()
    if not run:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run not found")

    ended_at = utc_now()
    if run.started_at:
        run.duration_ms = int((ended_at - aware_utc(run.started_at)).total_seconds() * 1000)
    capture_mode = get_capture_mode_for_run(db, run.id)
    run.ended_at = ended_at
    run.status = payload.status
    run.final_output = apply_capture_mode(payload.output or {}, capture_mode)
    run.failure_type = payload.failure_type
    run.severity = payload.severity
    run.requires_review = payload.requires_review

    # Aggregate token counts and estimated cost from all spans.
    total_input_tokens = 0
    total_output_tokens = 0
    total_cost = 0.0
    for span in run.spans:
        if span.input_tokens:
            total_input_tokens += span.input_tokens
        if span.output_tokens:
            total_output_tokens += span.output_tokens
        if span.estimated_cost_usd:
            total_cost += span.estimated_cost_usd
    run.total_input_tokens = total_input_tokens if total_input_tokens > 0 else None
    run.total_output_tokens = total_output_tokens if total_output_tokens > 0 else None
    run.estimated_cost_usd = total_cost if total_cost > 0 else None

    db.commit()
    return {"run_id": run.id, "status": run.status}


@router.get("/runs", response_model=List[RunSummary])
def list_runs(
    status: Optional[str] = Query(None, description="Filter by run status"),
    failure_type: Optional[str] = Query(None, description="Filter by failure type"),
    requires_review: Optional[bool] = Query(None, description="Filter by review flag"),
    workflow_id: Optional[str] = Query(None, description="Filter by workflow ID"),
    search: Optional[str] = Query(None, description="Search user_query or final_output text"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    query = db.query(Run)

    if status:
        query = query.filter(Run.status == status)
    if failure_type:
        query = query.filter(Run.failure_type == failure_type)
    if requires_review is not None:
        query = query.filter(Run.requires_review == requires_review)
    if workflow_id:
        query = query.filter(Run.workflow_id == workflow_id)
    if search:
        like = f"%{search}%"
        query = query.filter(
            or_(
                Run.user_query.ilike(like),
                Run.final_output.cast(str).ilike(like),
            )
        )

    runs = (
        query.order_by(Run.started_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return runs


@router.get("/runs/{run_id}", response_model=RunDetail)
def get_run(run_id: str, db: Session = Depends(get_db)):
    run = (
        db.query(Run)
        .options(
            selectinload(Run.spans).selectinload(Span.artifacts),
            selectinload(Run.spans).selectinload(Span.retrieved_documents),
            selectinload(Run.artifacts),
            selectinload(Run.annotations),
        )
        .filter(Run.id == run_id)
        .first()
    )
    if not run:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run not found")
    return run


@router.post("/runs/{run_id}/feedback")
def create_feedback(run_id: str, payload: FeedbackCreate, db: Session = Depends(get_db)):
    run = db.query(Run).filter(Run.id == run_id).first()
    if not run:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run not found")

    annotation = Annotation(
        run_id=run_id,
        span_id=payload.span_id,
        label=payload.label,
        note=payload.note,
    )
    db.add(annotation)
    db.commit()
    db.refresh(annotation)
    return {"annotation_id": annotation.id}


@router.get("/runs/{run_id}/similar-failures")
def similar_failures(run_id: str, db: Session = Depends(get_db)):
    target = db.query(Run).filter(Run.id == run_id).first()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run not found")

    candidates = (
        db.query(Run)
        .filter(
            Run.workflow_id == target.workflow_id,
            Run.status == "failure",
            Run.id != run_id,
        )
        .order_by(Run.started_at.desc())
        .limit(100)
        .all()
    )

    results = []
    for candidate in candidates:
        score = 0.0
        if target.failure_type and candidate.failure_type == target.failure_type:
            score += 0.5
        if target.user_query and candidate.user_query:
            sim = difflib.SequenceMatcher(None, target.user_query, candidate.user_query).ratio()
            score += sim * 0.5
        if score > 0.1:
            results.append(
                {
                    "run_id": candidate.id,
                    "started_at": candidate.started_at,
                    "failure_type": candidate.failure_type,
                    "user_query": candidate.user_query,
                    "similarity_score": round(score, 2),
                }
            )

    results.sort(key=lambda x: x["similarity_score"], reverse=True)
    return results[:5]


@router.patch("/runs/{run_id}/review-status")
def update_review_status(
    run_id: str,
    requires_review: bool,
    db: Session = Depends(get_db),
    api_key: str = Depends(verify_api_key),
):
    run = db.query(Run).filter(Run.id == run_id).first()
    if not run:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run not found")

    run.requires_review = requires_review
    project_id = get_project_id_for_run(db, run_id)
    log_audit_event(
        db=db,
        actor=api_key,
        action="update_review_status",
        resource_type="run",
        resource_id=run_id,
        note=f"Updated requires_review to {requires_review}",
        project_id=project_id,
    )
    db.commit()
    db.refresh(run)
    return {"run_id": run.id, "requires_review": run.requires_review}


@router.post("/runs/{run_id}/suggest-failure-type")
def suggest_run_failure_type(run_id: str, db: Session = Depends(get_db)):
    run = (
        db.query(Run)
        .options(selectinload(Run.spans))
        .filter(Run.id == run_id)
        .first()
    )
    if not run:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run not found")

    run.suggested_failure_type = suggest_failure_type(run)
    run.analyzed_at = utc_now()
    db.commit()
    db.refresh(run)
    return {
        "run_id": run.id,
        "suggested_failure_type": run.suggested_failure_type,
        "description": FAILURE_TAXONOMY.get(run.suggested_failure_type, ""),
    }


@router.post("/runs/{run_id}/summarize")
def analyze_run(run_id: str, db: Session = Depends(get_db)):
    run = db.query(Run).filter(Run.id == run_id).first()
    if not run:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run not found")

    dispatch = dispatch_summarize(run_id)
    # Refresh so callers get the freshly persisted summary fields when sync.
    db.refresh(run)
    return {
        "run_id": run.id,
        "execution": dispatch,
        "summary": run.summary,
        "failure_explanation": run.failure_explanation,
        "patch_suggestion": run.patch_suggestion,
        "suggested_failure_type": run.suggested_failure_type,
        "analyzed_at": run.analyzed_at,
    }
