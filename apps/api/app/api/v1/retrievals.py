from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.dependencies import verify_api_key
from app.models import RetrievedDocument, Span
from app.schemas import RetrievalCreate

router = APIRouter(tags=["retrievals"], dependencies=[Depends(verify_api_key)])


@router.post("/retrievals")
def record_retrieval(payload: RetrievalCreate, db: Session = Depends(get_db)):
    span = db.query(Span).filter(Span.id == payload.span_id).first()
    if not span:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Span not found")

    span.span_type = "retrieval"

    created = []
    for doc in payload.documents:
        retrieved = RetrievedDocument(
            span_id=payload.span_id,
            source_name=doc.get("source_name", "unknown"),
            source_uri=doc.get("source_uri"),
            chunk_id=doc.get("chunk_id"),
            rank=doc.get("rank"),
            score=doc.get("score"),
            content_snippet=doc.get("content_snippet"),
            metadata_json=doc.get("metadata"),
        )
        db.add(retrieved)
        created.append(retrieved)

    db.commit()
    for r in created:
        db.refresh(r)

    return {"documents_recorded": len(created)}
