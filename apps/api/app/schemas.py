"""Pydantic schemas for read/write operations.

All read schemas use ``model_config = ConfigDict(from_attributes=True, populate_by_name=True)``
so Pydantic v2 can serialize ORM rows without the legacy ``class Config`` block.

Fields whose ORM attribute is ``metadata_json`` are exposed as ``metadata`` via the
``validation_alias`` / ``serialization_alias`` pair so API consumers see a stable
``metadata`` key while the database column keeps its JSON-flavored name.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field


_METADATA_FIELD = Field(
    default=None,
    validation_alias="metadata_json",
    serialization_alias="metadata",
)


class ProjectCreate(BaseModel):
    name: str
    slug: str
    api_key: str


class EnvironmentCreate(BaseModel):
    project_id: str
    name: str
    is_production: bool = False


class WorkflowCreate(BaseModel):
    project_id: str
    name: str
    type: Optional[str] = None
    description: Optional[str] = None
    framework: Optional[str] = None
    current_version: str = "v1"


class RunStart(BaseModel):
    workflow_name: str
    environment: str = "local"
    external_run_id: Optional[str] = None
    input: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None
    started_at: Optional[datetime] = None


class RunStartResponse(BaseModel):
    run_id: str
    status: str


class SpanStart(BaseModel):
    run_id: str
    parent_span_id: Optional[str] = None
    span_type: str
    name: str
    started_at: Optional[datetime] = None
    input_payload: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None


class SpanStartResponse(BaseModel):
    span_id: str


class SpanEnd(BaseModel):
    status: str
    output_payload: Optional[Dict[str, Any]] = None
    metrics: Optional[Dict[str, Any]] = None


class ToolCallCreate(BaseModel):
    span_id: str
    run_id: str
    tool_name: str
    arguments: Dict[str, Any]
    result: Optional[Dict[str, Any]] = None
    status: str = "ok"
    duration_ms: Optional[int] = None


class RetrievalCreate(BaseModel):
    span_id: str
    documents: List[Dict[str, Any]]


class ArtifactCreate(BaseModel):
    run_id: str
    span_id: Optional[str] = None
    artifact_type: str
    mime_type: str
    filename: str
    storage_url: Optional[str] = None
    content_text: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class RunEnd(BaseModel):
    status: str = Field(..., pattern="^(running|success|failure|cancelled)$")
    output: Optional[Dict[str, Any]] = None
    failure_type: Optional[str] = None
    severity: Optional[str] = None
    requires_review: bool = False


class EvalRerunOptions(BaseModel):
    prompt_version: Optional[str] = None
    model_name: Optional[str] = None
    temperature: Optional[float] = None
    workflow_version: Optional[str] = None


class EvalResultSummary(BaseModel):
    id: str
    eval_case_id: str
    workflow_version: Optional[str] = None
    prompt_version: Optional[str] = None
    model_name: Optional[str] = None
    temperature: Optional[float] = None
    run_id: Optional[str] = None
    score: Optional[float] = None
    passed: bool = False
    judge_reason: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class FeedbackCreate(BaseModel):
    label: str
    note: Optional[str] = None
    span_id: Optional[str] = None


class RunSummary(BaseModel):
    id: str
    workflow_id: str
    environment_id: str
    status: str
    started_at: datetime
    ended_at: Optional[datetime] = None
    duration_ms: Optional[int] = None
    user_query: Optional[str] = None
    failure_type: Optional[str] = None
    severity: Optional[str] = None
    requires_review: bool = False
    score: Optional[float] = None
    summary: Optional[str] = None
    failure_explanation: Optional[str] = None
    patch_suggestion: Optional[str] = None
    suggested_failure_type: Optional[str] = None
    analyzed_at: Optional[datetime] = None
    metadata: Optional[Dict[str, Any]] = _METADATA_FIELD

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class RetrievedDocumentSummary(BaseModel):
    id: str
    span_id: str
    source_name: str
    source_uri: Optional[str] = None
    chunk_id: Optional[str] = None
    rank: Optional[int] = None
    score: Optional[float] = None
    content_snippet: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = _METADATA_FIELD

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class ArtifactSummary(BaseModel):
    id: str
    run_id: str
    span_id: Optional[str] = None
    artifact_type: str
    storage_url: Optional[str] = None
    mime_type: Optional[str] = None
    filename: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = _METADATA_FIELD

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class AnnotationCreate(BaseModel):
    run_id: str
    span_id: Optional[str] = None
    label: str
    note: Optional[str] = None


class AnnotationSummary(BaseModel):
    id: str
    run_id: str
    span_id: Optional[str] = None
    label: str
    note: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class SpanSummary(BaseModel):
    id: str
    run_id: str
    parent_span_id: Optional[str] = None
    span_type: str
    name: str
    status: str
    started_at: datetime
    ended_at: Optional[datetime] = None
    duration_ms: Optional[int] = None
    model_name: Optional[str] = None
    tool_name: Optional[str] = None
    input_tokens: Optional[int] = None
    output_tokens: Optional[int] = None
    prompt_version: Optional[str] = None
    temperature: Optional[float] = None
    metadata: Optional[Dict[str, Any]] = _METADATA_FIELD
    input_payload: Optional[Dict[str, Any]] = None
    output_payload: Optional[Dict[str, Any]] = None
    retrieved_documents: List[RetrievedDocumentSummary] = []
    artifacts: List[ArtifactSummary] = []

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class RunDetail(BaseModel):
    id: str
    workflow_id: str
    environment_id: str
    status: str
    started_at: datetime
    ended_at: Optional[datetime] = None
    duration_ms: Optional[int] = None
    total_input_tokens: Optional[int] = None
    total_output_tokens: Optional[int] = None
    estimated_cost_usd: Optional[float] = None
    user_query: Optional[str] = None
    final_output: Optional[Dict[str, Any]] = None
    failure_type: Optional[str] = None
    severity: Optional[str] = None
    requires_review: bool = False
    score: Optional[float] = None
    metadata: Optional[Dict[str, Any]] = _METADATA_FIELD
    summary: Optional[str] = None
    failure_explanation: Optional[str] = None
    patch_suggestion: Optional[str] = None
    suggested_failure_type: Optional[str] = None
    analyzed_at: Optional[datetime] = None
    spans: List[SpanSummary] = []
    artifacts: List[ArtifactSummary] = []
    annotations: List[AnnotationSummary] = []

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
