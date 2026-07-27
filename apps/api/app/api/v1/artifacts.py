import json
import uuid
from typing import Any, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.dependencies import verify_api_key
from app.models import Artifact, Run
from app.schemas import ArtifactCreate
from app.services.storage import upload_bytes

router = APIRouter(tags=["artifacts"], dependencies=[Depends(verify_api_key)])

# Cap metadata blobs so a single upload can't pin the worker / DB.
MAX_METADATA_JSON_BYTES = 64 * 1024


@router.post("/artifacts")
def record_artifact(payload: ArtifactCreate, db: Session = Depends(get_db)):
    run = db.query(Run).filter(Run.id == payload.run_id).first()
    if not run:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run not found")

    artifact = Artifact(
        run_id=payload.run_id,
        span_id=payload.span_id,
        artifact_type=payload.artifact_type,
        mime_type=payload.mime_type,
        filename=payload.filename,
        storage_url=payload.storage_url,
        metadata_json=payload.metadata,
    )
    db.add(artifact)
    db.commit()
    db.refresh(artifact)
    return {"artifact_id": artifact.id}


@router.post("/artifacts/upload")
def upload_artifact(
    run_id: str = Form(...),
    artifact_type: str = Form(...),
    file: UploadFile = File(...),
    span_id: Optional[str] = Form(None),
    metadata_json: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    run = db.query(Run).filter(Run.id == run_id).first()
    if not run:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run not found")

    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Filename is required")

    content = file.file.read()
    extension = file.filename.rsplit(".", 1)[-1] if "." in file.filename else "bin"
    key = f"{run_id}/{uuid.uuid4()}.{extension}"

    storage_url = upload_bytes(
        key,
        content,
        content_type=file.content_type or "application/octet-stream",
    )

    metadata: dict[str, Any] = {"size_bytes": len(content)}
    if metadata_json:
        if len(metadata_json) > MAX_METADATA_JSON_BYTES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"metadata_json exceeds {MAX_METADATA_JSON_BYTES} bytes",
            )
        try:
            parsed = json.loads(metadata_json)
            if not isinstance(parsed, dict):
                raise ValueError("metadata_json must decode to an object")
            metadata.update(parsed)
        except (ValueError, TypeError) as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"metadata_json must be a valid JSON object string: {exc}",
            )

    artifact = Artifact(
        run_id=run_id,
        span_id=span_id,
        artifact_type=artifact_type,
        mime_type=file.content_type or "application/octet-stream",
        filename=file.filename,
        storage_url=storage_url,
        metadata_json=metadata,
    )
    db.add(artifact)
    db.commit()
    db.refresh(artifact)
    return {"artifact_id": artifact.id, "storage_url": storage_url}
