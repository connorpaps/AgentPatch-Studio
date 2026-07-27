from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.dependencies import verify_api_key
from app.models import Span
from app.schemas import ToolCallCreate

router = APIRouter(tags=["tool-calls"], dependencies=[Depends(verify_api_key)])


@router.post("/tool-calls")
def record_tool_call(payload: ToolCallCreate, db: Session = Depends(get_db)):
    span = db.query(Span).filter(Span.id == payload.span_id).first()
    if not span:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Span not found")

    span.span_type = "tool_call"
    span.tool_name = payload.tool_name
    span.input_payload = payload.arguments
    span.output_payload = payload.result
    span.status = payload.status
    span.duration_ms = payload.duration_ms
    db.commit()
    db.refresh(span)
    return {"span_id": span.id, "tool_name": span.tool_name}
