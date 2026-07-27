"""OTLP-style trace ingestion adapter."""

import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.dependencies import verify_api_key
from app.models import Environment, Project, Run, Span, Workflow
from app.services.redaction import apply_capture_mode, apply_capture_mode_to_text

router = APIRouter(tags=["ingest"], dependencies=[Depends(verify_api_key)])


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


class IngestSpan:
    def __init__(self, data: Dict[str, Any]):
        self.span_id = data.get("span_id") or data.get("spanId") or data.get("id")
        self.parent_id = data.get("parent_span_id") or data.get("parentSpanId")
        self.name = data.get("name", "span")
        self.kind = data.get("kind", "internal")
        self.started_at = data.get("started_at") or data.get("start_time")
        self.ended_at = data.get("ended_at") or data.get("end_time")
        self.status = data.get("status", "ok")
        self.attributes = data.get("attributes", {}) or {}
        self.events = data.get("events", [])


def _redact_span_payload(value: Any, capture_mode: str) -> Dict[str, Any]:
    """Normalize an attribute value to a dict and apply capture mode redaction."""
    if isinstance(value, dict):
        return apply_capture_mode(value, capture_mode)
    # Non-dict values are wrapped so redaction can still be applied consistently.
    wrapped = {"value": value} if value is not None else {}
    return apply_capture_mode(wrapped, capture_mode)


def _parse_timestamp(value: Any) -> Optional[datetime.datetime]:
    if not value:
        return None
    if isinstance(value, datetime.datetime):
        return value
    if isinstance(value, str):
        # Try ISO format; fall back to replacing Z.
        try:
            return datetime.datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
    return None


@router.post("/ingest/otlp")
def ingest_otlp(payload: Dict[str, Any], db: Session = Depends(get_db), api_key: str = Depends(verify_api_key)):
    """Accept a simplified OTLP-style trace payload and normalize it into runs/spans."""
    resource_spans = payload.get("resource_spans") or payload.get("resourceSpans") or []
    if not resource_spans:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="resource_spans is required")

    created_run_ids: List[str] = []

    for resource_span in resource_spans:
        resource = resource_span.get("resource", {}) or {}
        resource_attrs = resource.get("attributes", {}) or {}

        workflow_name = resource_attrs.get("service.name") or resource_attrs.get("workflow_name") or "unknown"
        environment_name = resource_attrs.get("deployment.environment") or resource_attrs.get("environment") or "local"

        project = _get_or_create_project(db, api_key)
        environment = _get_or_create_environment(db, project.id, environment_name)
        workflow = _get_or_create_workflow(db, project.id, workflow_name)

        for scope_span in resource_span.get("scope_spans") or resource_span.get("scopeSpans") or []:
            spans = scope_span.get("spans") or []
            root_span_data = next((s for s in spans if not (s.get("parent_span_id") or s.get("parentSpanId"))), spans[0] if spans else None)
            if not root_span_data:
                continue

            root = IngestSpan(root_span_data)
            user_query = root.attributes.get("user_query") or root.attributes.get("userQuery")
            run = Run(
                workflow_id=workflow.id,
                environment_id=environment.id,
                external_run_id=root.span_id,
                status="running" if root.status not in ("ok", "error") else ("success" if root.status == "ok" else "failure"),
                started_at=_parse_timestamp(root.started_at) or datetime.datetime.utc(),
                user_query=apply_capture_mode_to_text(user_query, project.capture_mode),
                metadata_json=resource_attrs,
            )
            db.add(run)
            db.commit()
            db.refresh(run)
            created_run_ids.append(run.id)

            span_map: Dict[str, Span] = {}
            span_objects = []
            for span_data in spans:
                sp = IngestSpan(span_data)
                span = Span(
                    run_id=run.id,
                    parent_span_id=None,
                    span_type=sp.attributes.get("span.type") or sp.kind or "internal",
                    name=sp.name,
                    status=sp.status,
                    started_at=_parse_timestamp(sp.started_at) or run.started_at,
                    ended_at=_parse_timestamp(sp.ended_at),
                    model_name=sp.attributes.get("gen_ai.system") or sp.attributes.get("model_name"),
                    tool_name=sp.attributes.get("tool.name") or sp.attributes.get("tool_name"),
                    input_tokens=sp.attributes.get("gen_ai.usage.input_tokens") or sp.attributes.get("input_tokens"),
                    output_tokens=sp.attributes.get("gen_ai.usage.output_tokens") or sp.attributes.get("output_tokens"),
                    estimated_cost_usd=sp.attributes.get("estimated_cost_usd"),
                    prompt_version=sp.attributes.get("prompt_version"),
                    temperature=sp.attributes.get("temperature"),
                    input_payload=_redact_span_payload(sp.attributes.get("input") or sp.attributes.get("input_payload"), project.capture_mode),
                    output_payload=_redact_span_payload(sp.attributes.get("output") or sp.attributes.get("output_payload"), project.capture_mode),
                    metadata_json=sp.attributes,
                )
                db.add(span)
                span_objects.append((sp, span))
            db.commit()

            for _, span in span_objects:
                db.refresh(span)

            # Build map and link parents after refresh.
            for sp, span in span_objects:
                span_map[sp.span_id] = span

            for sp, span in span_objects:
                parent_id = sp.parent_id
                if parent_id and parent_id in span_map:
                    span.parent_span_id = span_map[parent_id].id
            db.commit()

    return {"run_ids": created_run_ids}
