from typing import Optional

from fastapi import APIRouter, Depends, Form, HTTPException, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.dependencies import verify_api_key
from app.models import Run
from app.services.audit import get_project_id_for_run, log_audit_event
from app.services.dispatch import dispatch_replay

router = APIRouter(tags=["replays"], dependencies=[Depends(verify_api_key)])


@router.post("/replays/{run_id}")
def replay_run(
    run_id: str,
    mode: str = Form("metadata"),
    model_name: Optional[str] = Form(None),
    temperature: Optional[float] = Form(None),
    db: Session = Depends(get_db),
    api_key: str = Depends(verify_api_key),
):
    allowed = {"metadata", "partial", "full"}
    if mode not in allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"mode must be one of {sorted(allowed)}",
        )

    if mode == "full":
        import os

        if os.getenv("ALLOW_FULL_REPLAY", "false").lower() != "true":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="full replay is disabled; set ALLOW_FULL_REPLAY=true to enable",
            )

    target = db.query(Run).filter(Run.id == run_id).first()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run not found")

    project_id = get_project_id_for_run(db, run_id)
    result = dispatch_replay(
        run_id=run_id,
        mode=mode,
        model_name=model_name,
        temperature=temperature,
    )

    log_audit_event(
        db=db,
        actor=api_key,
        action=f"replay_run:{mode}",
        resource_type="run",
        resource_id=run_id,
        note=(
            f"Triggered {mode} replay "
            f"(model={model_name or 'inherit'}, temperature={temperature if temperature is not None else 'inherit'})"
        ),
        project_id=project_id,
    )
    db.commit()
    return result
