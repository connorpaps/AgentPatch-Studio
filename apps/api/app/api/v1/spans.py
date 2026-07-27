import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db import aware_utc, get_db, utc_now
from app.dependencies import verify_api_key
from app.models import Run, Span
from app.schemas import SpanEnd, SpanStart, SpanStartResponse
from app.services.redaction import apply_capture_mode, get_capture_mode_for_run

router = APIRouter(tags=["spans"], dependencies=[Depends(verify_api_key)])


@router.post("/spans", response_model=SpanStartResponse)
def start_span(payload: SpanStart, db: Session = Depends(get_db)):
    run = db.query(Run).filter(Run.id == payload.run_id).first()
    if not run:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run not found")

    capture_mode = get_capture_mode_for_run(db, payload.run_id)
    span = Span(
        run_id=payload.run_id,
        parent_span_id=payload.parent_span_id,
        span_type=payload.span_type,
        name=payload.name,
        status="ok",
        started_at=payload.started_at or datetime.datetime.now(datetime.timezone.utc),
        input_payload=apply_capture_mode(payload.input_payload or {}, capture_mode),
        metadata_json=payload.metadata,
    )
    db.add(span)
    db.commit()
    db.refresh(span)
    return SpanStartResponse(span_id=span.id)


@router.post("/spans/{span_id}/end")
def end_span(span_id: str, payload: SpanEnd, db: Session = Depends(get_db)):
    span = db.query(Span).filter(Span.id == span_id).first()
    if not span:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Span not found")

    ended_at = utc_now()
    duration = None
    if span.started_at:
        duration = int((ended_at - aware_utc(span.started_at)).total_seconds() * 1000)

    capture_mode = get_capture_mode_for_run(db, span.run_id)
    span.ended_at = ended_at
    span.duration_ms = duration
    span.status = payload.status
    span.output_payload = apply_capture_mode(payload.output_payload or {}, capture_mode)
    if payload.metrics:
        span.input_tokens = payload.metrics.get("input_tokens")
        span.output_tokens = payload.metrics.get("output_tokens")
        span.estimated_cost_usd = payload.metrics.get("estimated_cost_usd")
        span.model_name = payload.metrics.get("model_name")
        span.prompt_version = payload.metrics.get("prompt_version")
        span.temperature = payload.metrics.get("temperature")

    db.commit()
    db.refresh(span)
    return {"span_id": span.id, "status": span.status}
