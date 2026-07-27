"""Analytics endpoints for cost, latency, and token usage."""

from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from app.db import get_db
from app.dependencies import verify_api_key
from app.models import Run, Span, Workflow

router = APIRouter(tags=["analytics"], dependencies=[Depends(verify_api_key)])


@router.get("/analytics/cost-by-workflow")
def cost_by_workflow(db: Session = Depends(get_db)):
    rows = (
        db.query(
            Workflow.id.label("workflow_id"),
            Workflow.name.label("workflow_name"),
            func.coalesce(func.sum(Run.estimated_cost_usd), 0.0).label("total_cost"),
            func.count(Run.id).label("run_count"),
        )
        .join(Run, Run.workflow_id == Workflow.id)
        .group_by(Workflow.id)
        .order_by(desc("total_cost"))
        .all()
    )
    return [
        {
            "workflow_id": row.workflow_id,
            "workflow_name": row.workflow_name,
            "total_cost": float(row.total_cost),
            "run_count": row.run_count,
        }
        for row in rows
    ]


@router.get("/analytics/slowest-spans")
def slowest_spans(db: Session = Depends(get_db)):
    rows = (
        db.query(
            Span.name.label("span_name"),
            func.avg(Span.duration_ms).label("avg_duration_ms"),
            func.count(Span.id).label("occurrences"),
        )
        .filter(Span.duration_ms.isnot(None))
        .group_by(Span.name)
        .order_by(desc("avg_duration_ms"))
        .limit(10)
        .all()
    )
    return [
        {
            "span_name": row.span_name,
            "avg_duration_ms": round(float(row.avg_duration_ms or 0), 2),
            "occurrences": row.occurrences,
        }
        for row in rows
    ]


@router.get("/analytics/token-heavy-spans")
def token_heavy_spans(db: Session = Depends(get_db)):
    rows = (
        db.query(
            Span.name.label("span_name"),
            func.avg(func.coalesce(Span.input_tokens, 0) + func.coalesce(Span.output_tokens, 0)).label("avg_tokens"),
            func.count(Span.id).label("occurrences"),
        )
        .filter(Span.input_tokens.isnot(None), Span.output_tokens.isnot(None))
        .group_by(Span.name)
        .order_by(desc("avg_tokens"))
        .limit(10)
        .all()
    )
    return [
        {
            "span_name": row.span_name,
            "avg_tokens": round(float(row.avg_tokens or 0), 2),
            "occurrences": row.occurrences,
        }
        for row in rows
    ]
