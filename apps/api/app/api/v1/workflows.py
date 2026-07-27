from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.dependencies import verify_api_key
from app.models import Workflow
from app.schemas import WorkflowCreate

router = APIRouter(tags=["workflows"], dependencies=[Depends(verify_api_key)])


@router.get("/workflows")
def list_workflows(db: Session = Depends(get_db)):
    workflows = db.query(Workflow).all()
    return [
        {
            "id": w.id,
            "project_id": w.project_id,
            "name": w.name,
            "type": w.type,
            "description": w.description,
            "framework": w.framework,
            "current_version": w.current_version,
        }
        for w in workflows
    ]


@router.post("/workflows")
def create_workflow(payload: WorkflowCreate, db: Session = Depends(get_db)):
    workflow = Workflow(**payload.model_dump())
    db.add(workflow)
    db.commit()
    db.refresh(workflow)
    return workflow
