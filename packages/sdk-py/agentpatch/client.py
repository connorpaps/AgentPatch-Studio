from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any, Dict, Iterable, List, Mapping, MutableMapping, Optional

import requests

from .models import (
    AnnotationInput,
    ArtifactInput,
    CaptureEvent,
    RunStatus,
    SpanStatus,
    SpanType,
    ToolCallRecord,
)


@dataclass
class AgentPatchConfig:
    base_url: str
    api_key: str
    workflow_name: str
    environment: str = "local"
    capture_mode: str = "full"


@dataclass
class _StartRunResponse:
    run_id: str
    status: str


@dataclass
class _StartSpanResponse:
    span_id: str


class AgentPatch:
    def __init__(
        self,
        base_url: str,
        api_key: str,
        workflow_name: str,
        environment: str = "local",
        capture_mode: str = "full",
        timeout: float = 30.0,
    ):
        self.config = AgentPatchConfig(base_url.rstrip("/"), api_key, workflow_name, environment, capture_mode)
        self.timeout = timeout
        self._session = requests.Session()
        self._session.headers.update(
            {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}",
            }
        )

    def _post(self, path: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        url = f"{self.config.base_url}{path}"
        response = self._session.post(url, json=payload, timeout=self.timeout)
        response.raise_for_status()
        return response.json()

    def _post_form(self, path: str, form: Mapping[str, Any]) -> Dict[str, Any]:
        url = f"{self.config.base_url}{path}"
        response = self._session.post(url, data=form, timeout=self.timeout)
        response.raise_for_status()
        return response.json()

    def start_run(
        self,
        input: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None,
        external_run_id: Optional[str] = None,
    ) -> _StartRunResponse:
        payload: Dict[str, Any] = {
            "workflow_name": self.config.workflow_name,
            "environment": self.config.environment,
        }
        if input is not None:
            payload["input"] = input
        if metadata is not None:
            payload["metadata"] = metadata
        if external_run_id is not None:
            payload["external_run_id"] = external_run_id
        data = self._post("/api/v1/runs/start", payload)
        return _StartRunResponse(run_id=data["run_id"], status=data["status"])

    def end_run(
        self,
        run_id: str,
        status: RunStatus,
        output: Optional[Dict[str, Any]] = None,
        failure_type: Optional[str] = None,
        severity: Optional[str] = None,
        requires_review: bool = False,
    ) -> Dict[str, Any]:
        payload: Dict[str, Any] = {
            "status": status,
            "requires_review": requires_review,
        }
        if output is not None:
            payload["output"] = output
        if failure_type is not None:
            payload["failure_type"] = failure_type
        if severity is not None:
            payload["severity"] = severity
        return self._post(f"/api/v1/runs/{run_id}/end", payload)

    def start_span(
        self,
        run_id: str,
        span_type: SpanType,
        name: str,
        input_payload: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None,
        parent_span_id: Optional[str] = None,
    ) -> _StartSpanResponse:
        payload: Dict[str, Any] = {
            "run_id": run_id,
            "span_type": span_type,
            "name": name,
        }
        if input_payload is not None:
            payload["input_payload"] = input_payload
        if metadata is not None:
            payload["metadata"] = metadata
        if parent_span_id is not None:
            payload["parent_span_id"] = parent_span_id
        data = self._post("/api/v1/spans", payload)
        return _StartSpanResponse(span_id=data["span_id"])

    def end_span(
        self,
        span_id: str,
        status: SpanStatus,
        output: Optional[Dict[str, Any]] = None,
        metrics: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        payload: Dict[str, Any] = {"status": status}
        if output is not None:
            payload["output_payload"] = output
        if metrics is not None:
            payload["metrics"] = metrics
        return self._post(f"/api/v1/spans/{span_id}/end", payload)

    def record_tool_call(self, span_id: str, tool_call: ToolCallRecord) -> Dict[str, Any]:
        return self._post("/api/v1/tool-calls", tool_call.to_dict(span_id))

    def record_retrieval(
        self,
        span_id: str,
        documents: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        return self._post("/api/v1/retrievals", {"span_id": span_id, "documents": documents})

    def record_artifact(self, run_id: str, artifact: ArtifactInput) -> Dict[str, Any]:
        return self._post("/api/v1/artifacts", {"run_id": run_id, **artifact.to_dict()})

    def upload_artifact(
        self,
        run_id: str,
        artifact_type: str,
        filename: str,
        data: bytes,
        mime_type: Optional[str] = None,
        span_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        form: MutableMapping[str, Any] = {
            "run_id": run_id,
            "artifact_type": artifact_type,
            "file": (filename, data, mime_type or "application/octet-stream"),
        }
        if span_id:
            form["span_id"] = span_id
        if metadata:
            form["metadata_json"] = json.dumps(metadata)
        return self._post_form("/api/v1/artifacts/upload", form)

    def record_annotation(self, run_id: str, annotation: AnnotationInput) -> Dict[str, Any]:
        return self._post("/api/v1/annotations", annotation.to_dict(run_id))

    def record_feedback(
        self,
        run_id: str,
        label: str,
        note: Optional[str] = None,
        span_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        payload: Dict[str, Any] = {"label": label}
        if note is not None:
            payload["note"] = note
        if span_id is not None:
            payload["span_id"] = span_id
        return self._post(f"/api/v1/runs/{run_id}/feedback", payload)

    def record_events(self, run_id: str, events: Iterable[CaptureEvent]) -> List[Dict[str, Any]]:
        """Send a batch of capture events. Each event is dispatched individually
        so a single failure doesn't roll back the others.
        """
        results: List[Dict[str, Any]] = []
        for event in events:
            payload = event.payload
            try:
                if event.type == "span":
                    self.start_span(
                        run_id=run_id,
                        span_type=SpanType(payload["span_type"]),
                        name=payload["name"],
                        input_payload=payload.get("input_payload"),
                        metadata=payload.get("metadata"),
                        parent_span_id=payload.get("parent_span_id"),
                    )
                elif event.type == "tool_call":
                    self.record_tool_call(
                        payload["span_id"],
                        ToolCallRecord(
                            span_id=payload["span_id"],
                            run_id=run_id,
                            tool_name=payload["tool_name"],
                            arguments=payload["arguments"],
                            result=payload.get("result"),
                            status=SpanStatus(payload.get("status", "ok")),
                            duration_ms=payload.get("duration_ms"),
                        ),
                    )
                elif event.type == "retrieval":
                    self.record_retrieval(payload["span_id"], payload.get("documents", []))
                elif event.type == "artifact":
                    self.record_artifact(run_id, ArtifactInput(**payload))
                elif event.type == "annotation":
                    self.record_annotation(run_id, AnnotationInput(**payload))
                else:
                    results.append({"ok": False, "type": event.type, "error": f"unknown event type: {event.type}"})
                    continue
                results.append({"ok": True, "type": event.type})
            except Exception as exc:  # noqa: BLE001
                results.append({"ok": False, "type": event.type, "error": str(exc)})
        return results

    def replay(
        self,
        run_id: str,
        mode: str = "metadata",
        model_name: Optional[str] = None,
        temperature: Optional[float] = None,
    ) -> Dict[str, Any]:
        form: MutableMapping[str, Any] = {"mode": mode}
        if model_name:
            form["model_name"] = model_name
        if temperature is not None:
            form["temperature"] = str(temperature)
        return self._post_form(f"/api/v1/replays/{run_id}", form)

    def close(self) -> None:
        self._session.close()

    def __enter__(self) -> "AgentPatch":
        return self

    def __exit__(self, exc_type, exc, tb) -> None:  # noqa: ANN001
        self.close()
