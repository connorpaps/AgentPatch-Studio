from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.dependencies import verify_api_key
from app.models import Annotation, Run
from app.schemas import AnnotationCreate, AnnotationSummary
from app.services.audit import get_project_id_for_run, log_audit_event

router = APIRouter(tags=["annotations"], dependencies=[Depends(verify_api_key)])


@router.get("/annotations", response_model=List[AnnotationSummary])
def list_annotations(run_id: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Annotation)
    if run_id:
        query = query.filter(Annotation.run_id == run_id)
    return query.order_by(Annotation.created_at.desc()).all()


@router.post("/annotations", response_model=AnnotationSummary)
def create_annotation(
    payload: AnnotationCreate,
    db: Session = Depends(get_db),
    api_key: str = Depends(verify_api_key),
):
    run = db.query(Run).filter(Run.id == payload.run_id).first()
    if not run:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run not found")

    annotation = Annotation(
        run_id=payload.run_id,
        span_id=payload.span_id,
        label=payload.label,
        note=payload.note,
    )
    db.add(annotation)
    project_id = get_project_id_for_run(db, payload.run_id)
    log_audit_event(
        db=db,
        actor=api_key,
        action="create_annotation",
        resource_type="run",
        resource_id=payload.run_id,
        note=f"Added annotation: {payload.label}",
        project_id=project_id,
    )
    db.commit()
    db.refresh(annotation)
    return annotation
