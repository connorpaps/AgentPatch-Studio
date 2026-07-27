import datetime
import uuid

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base, utc_now


def _now():
    return utc_now()


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    api_key: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    capture_mode: Mapped[str] = mapped_column(String(20), default="full", nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), default=_now)


class Environment(Base):
    __tablename__ = "environments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    is_production: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), default=_now)

    project: Mapped["Project"] = relationship("Project")

    __table_args__ = (UniqueConstraint("project_id", "name", name="uq_project_environment"),)


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=True)
    role: Mapped[str] = mapped_column(String(50), default="member", nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), default=_now)


class ProjectMember(Base):
    __tablename__ = "project_members"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"), nullable=False, index=True)
    role: Mapped[str] = mapped_column(String(50), default="viewer", nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), default=_now)

    __table_args__ = (UniqueConstraint("user_id", "project_id", name="uq_project_member"),)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"), nullable=True, index=True)
    actor: Mapped[str] = mapped_column(String(255), nullable=False)
    action: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    resource_type: Mapped[str] = mapped_column(String(100), nullable=False)
    resource_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    note: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), default=_now)


class Workflow(Base):
    __tablename__ = "workflows"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    type: Mapped[str] = mapped_column(String(255), nullable=True)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    framework: Mapped[str] = mapped_column(String(255), nullable=True)
    current_version: Mapped[str] = mapped_column(String(50), default="v1")
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), default=_now)

    project: Mapped["Project"] = relationship("Project")

    __table_args__ = (UniqueConstraint("project_id", "name", name="uq_project_workflow"),)


class Run(Base):
    __tablename__ = "runs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    workflow_id: Mapped[str] = mapped_column(ForeignKey("workflows.id"), nullable=False, index=True)
    environment_id: Mapped[str] = mapped_column(ForeignKey("environments.id"), nullable=False, index=True)
    external_run_id: Mapped[str] = mapped_column(String(255), nullable=True, index=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    started_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), default=_now, index=True)
    ended_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    duration_ms: Mapped[int] = mapped_column(Integer, nullable=True)
    total_input_tokens: Mapped[int] = mapped_column(Integer, nullable=True)
    total_output_tokens: Mapped[int] = mapped_column(Integer, nullable=True)
    estimated_cost_usd: Mapped[float] = mapped_column(Float, nullable=True)
    root_span_id: Mapped[str] = mapped_column(String(36), nullable=True)
    user_query: Mapped[str] = mapped_column(Text, nullable=True)
    final_output: Mapped[dict] = mapped_column(JSON, nullable=True)
    failure_type: Mapped[str] = mapped_column(String(100), nullable=True, index=True)
    severity: Mapped[str] = mapped_column(String(50), nullable=True)
    requires_review: Mapped[bool] = mapped_column(Boolean, default=False)
    score: Mapped[float] = mapped_column(Float, nullable=True)
    metadata_json: Mapped[dict] = mapped_column(JSON, nullable=True)
    summary: Mapped[str] = mapped_column(Text, nullable=True)
    failure_explanation: Mapped[str] = mapped_column(Text, nullable=True)
    patch_suggestion: Mapped[str] = mapped_column(Text, nullable=True)
    suggested_failure_type: Mapped[str] = mapped_column(String(100), nullable=True, index=True)
    analyzed_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), nullable=True)

    workflow: Mapped["Workflow"] = relationship("Workflow")
    environment: Mapped["Environment"] = relationship("Environment")
    spans: Mapped[list["Span"]] = relationship("Span", lazy="selectin", back_populates="run")
    artifacts: Mapped[list["Artifact"]] = relationship("Artifact", lazy="selectin", back_populates="run")
    annotations: Mapped[list["Annotation"]] = relationship("Annotation", lazy="selectin", back_populates="run")


class Span(Base):
    __tablename__ = "spans"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    run_id: Mapped[str] = mapped_column(ForeignKey("runs.id"), nullable=False, index=True)
    parent_span_id: Mapped[str] = mapped_column(String(36), ForeignKey("spans.id"), nullable=True, index=True)
    span_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    started_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), default=_now, index=True)
    ended_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    duration_ms: Mapped[int] = mapped_column(Integer, nullable=True)
    model_name: Mapped[str] = mapped_column(String(255), nullable=True)
    tool_name: Mapped[str] = mapped_column(String(255), nullable=True)
    input_tokens: Mapped[int] = mapped_column(Integer, nullable=True)
    output_tokens: Mapped[int] = mapped_column(Integer, nullable=True)
    estimated_cost_usd: Mapped[float] = mapped_column(Float, nullable=True)
    prompt_version: Mapped[str] = mapped_column(String(50), nullable=True)
    temperature: Mapped[float] = mapped_column(Float, nullable=True)
    input_payload: Mapped[dict] = mapped_column(JSON, nullable=True)
    output_payload: Mapped[dict] = mapped_column(JSON, nullable=True)
    metadata_json: Mapped[dict] = mapped_column(JSON, nullable=True)

    run: Mapped["Run"] = relationship("Run", back_populates="spans")
    parent: Mapped["Span"] = relationship("Span", remote_side=[id])
    artifacts: Mapped[list["Artifact"]] = relationship("Artifact", lazy="selectin", back_populates="span")
    retrieved_documents: Mapped[list["RetrievedDocument"]] = relationship("RetrievedDocument", lazy="selectin", back_populates="span")
    annotations: Mapped[list["Annotation"]] = relationship("Annotation", lazy="selectin", back_populates="span")


class Artifact(Base):
    __tablename__ = "artifacts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    run_id: Mapped[str] = mapped_column(ForeignKey("runs.id"), nullable=False, index=True)
    span_id: Mapped[str] = mapped_column(ForeignKey("spans.id"), nullable=True, index=True)
    artifact_type: Mapped[str] = mapped_column(String(100), nullable=False)
    storage_url: Mapped[str] = mapped_column(Text, nullable=True)
    mime_type: Mapped[str] = mapped_column(String(255), nullable=True)
    filename: Mapped[str] = mapped_column(String(255), nullable=True)
    metadata_json: Mapped[dict] = mapped_column(JSON, nullable=True)

    run: Mapped["Run"] = relationship("Run", back_populates="artifacts")
    span: Mapped["Span"] = relationship("Span", back_populates="artifacts")


class RetrievedDocument(Base):
    __tablename__ = "retrieved_documents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    span_id: Mapped[str] = mapped_column(ForeignKey("spans.id"), nullable=False, index=True)
    source_name: Mapped[str] = mapped_column(String(500), nullable=False)
    source_uri: Mapped[str] = mapped_column(Text, nullable=True)
    chunk_id: Mapped[str] = mapped_column(String(255), nullable=True)
    rank: Mapped[int] = mapped_column(Integer, nullable=True)
    score: Mapped[float] = mapped_column(Float, nullable=True)
    content_snippet: Mapped[str] = mapped_column(Text, nullable=True)
    metadata_json: Mapped[dict] = mapped_column(JSON, nullable=True)

    span: Mapped["Span"] = relationship("Span", back_populates="retrieved_documents")


class Annotation(Base):
    __tablename__ = "annotations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    run_id: Mapped[str] = mapped_column(ForeignKey("runs.id"), nullable=False, index=True)
    span_id: Mapped[str] = mapped_column(ForeignKey("spans.id"), nullable=True, index=True)
    label: Mapped[str] = mapped_column(String(100), nullable=False)
    note: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), default=_now)

    run: Mapped["Run"] = relationship("Run", back_populates="annotations")
    span: Mapped["Span"] = relationship("Span", back_populates="annotations")


class EvalCase(Base):
    __tablename__ = "eval_cases"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"), nullable=False, index=True)
    source_run_id: Mapped[str] = mapped_column(ForeignKey("runs.id"), nullable=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    expected_behavior: Mapped[str] = mapped_column(Text, nullable=True)
    input_payload: Mapped[dict] = mapped_column(JSON, nullable=True)
    gold_output: Mapped[dict] = mapped_column(JSON, nullable=True)
    tags: Mapped[list] = mapped_column(JSON, nullable=True)

    project: Mapped["Project"] = relationship("Project")


class EvalResult(Base):
    __tablename__ = "eval_results"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    eval_case_id: Mapped[str] = mapped_column(ForeignKey("eval_cases.id"), nullable=False, index=True)
    workflow_version: Mapped[str] = mapped_column(String(50), nullable=True)
    prompt_version: Mapped[str] = mapped_column(String(50), nullable=True)
    model_name: Mapped[str] = mapped_column(String(255), nullable=True)
    temperature: Mapped[float] = mapped_column(Float, nullable=True)
    run_id: Mapped[str] = mapped_column(ForeignKey("runs.id"), nullable=True)
    score: Mapped[float] = mapped_column(Float, nullable=True)
    passed: Mapped[bool] = mapped_column(Boolean, default=False)
    judge_reason: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), default=_now)


class MagicLinkToken(Base):
    """One-time magic link used to mint session JWTs after email confirmation."""

    __tablename__ = "magic_link_tokens"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    token: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    purpose: Mapped[str] = mapped_column(String(50), default="session")  # session | demo
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"), nullable=True, index=True)
    expires_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    consumed_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), default=_now)

    __table_args__ = (UniqueConstraint("token", name="uq_magic_link_token"),)
