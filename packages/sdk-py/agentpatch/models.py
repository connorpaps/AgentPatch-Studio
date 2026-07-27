from dataclasses import dataclass, field
from typing import Any, Dict, Literal, Optional

RunStatus = Literal["running", "success", "failure", "cancelled"]
SpanType = Literal[
    "model_call",
    "tool_call",
    "retrieval",
    "chain",
    "guardrail",
    "human_review",
    "output",
]
SpanStatus = Literal["ok", "error", "warning"]
CaptureMode = Literal["metadata_only", "redacted", "full"]
EventType = Literal["span", "tool_call", "retrieval", "artifact", "annotation"]


@dataclass
class ToolCallRecord:
    tool_name: str
    arguments: Dict[str, Any]
    result: Optional[Dict[str, Any]] = None
    status: SpanStatus = "ok"
    duration_ms: Optional[int] = None

    def to_dict(self, span_id: str) -> Dict[str, Any]:
        return {
            "span_id": span_id,
            "tool_name": self.tool_name,
            "arguments": self.arguments,
            "result": self.result,
            "status": self.status,
            "duration_ms": self.duration_ms,
        }


@dataclass
class ArtifactInput:
    artifact_type: str
    mime_type: str
    filename: str
    storage_url: Optional[str] = None
    content_text: Optional[str] = None
    span_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        payload: Dict[str, Any] = {
            "artifact_type": self.artifact_type,
            "mime_type": self.mime_type,
            "filename": self.filename,
        }
        if self.storage_url is not None:
            payload["storage_url"] = self.storage_url
        if self.content_text is not None:
            payload["content_text"] = self.content_text
        if self.span_id is not None:
            payload["span_id"] = self.span_id
        if self.metadata is not None:
            payload["metadata"] = self.metadata
        return payload


@dataclass
class AnnotationInput:
    label: str
    note: Optional[str] = None
    span_id: Optional[str] = None

    def to_dict(self, run_id: str) -> Dict[str, Any]:
        payload: Dict[str, Any] = {
            "run_id": run_id,
            "label": self.label,
        }
        if self.note is not None:
            payload["note"] = self.note
        if self.span_id is not None:
            payload["span_id"] = self.span_id
        return payload


@dataclass
class CaptureEvent:
    """Single capture event emitted to the AgentPatch API in a batch."""

    type: EventType
    payload: Dict[str, Any]
