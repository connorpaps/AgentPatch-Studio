import pytest
import responses

from agentpatch import AgentPatch, AnnotationInput, ArtifactInput, ToolCallRecord


@pytest.fixture
def client():
    return AgentPatch(
        base_url="http://localhost:8000",
        api_key="test-key",
        workflow_name="support-policy-agent",
    )


@responses.activate
def test_start_run(client):
    responses.post(
        "http://localhost:8000/api/v1/runs/start",
        json={"run_id": "run-123", "status": "running"},
        status=200,
    )

    run = client.start_run(input={"user_query": "test"})

    assert run.run_id == "run-123"
    assert run.status == "running"

    request = responses.calls[0].request
    assert request.headers["Authorization"] == "Bearer test-key"
    body = request.body.decode("utf-8")
    assert "workflow_name" in body


@responses.activate
def test_end_run(client):
    responses.post(
        "http://localhost:8000/api/v1/runs/run-123/end",
        json={"run_id": "run-123", "status": "success"},
        status=200,
    )

    result = client.end_run("run-123", "success", output={"answer": "yes"})

    assert result["status"] == "success"


@responses.activate
def test_span_lifecycle(client):
    responses.post(
        "http://localhost:8000/api/v1/spans",
        json={"span_id": "span-1"},
        status=200,
    )
    responses.post(
        "http://localhost:8000/api/v1/spans/span-1/end",
        json={"span_id": "span-1", "status": "ok"},
        status=200,
    )

    span = client.start_span(
        "run-123",
        span_type="model_call",
        name="generate_answer",
        input_payload={"prompt": "hello"},
    )
    assert span.span_id == "span-1"

    result = client.end_span("span-1", "ok", output={"answer": "yes"})
    assert result["status"] == "ok"


@responses.activate
def test_record_retrieval(client):
    responses.post(
        "http://localhost:8000/api/v1/retrievals",
        json={"documents_recorded": 1},
        status=200,
    )

    result = client.record_retrieval(
        "span-1",
        documents=[
            {
                "source_name": "policy.pdf",
                "rank": 1,
                "score": 0.9,
            }
        ],
    )
    assert result["documents_recorded"] == 1


@responses.activate
def test_record_tool_call(client):
    responses.post(
        "http://localhost:8000/api/v1/tool-calls",
        json={"span_id": "span-1", "tool_name": "search"},
        status=200,
    )

    tool_call = ToolCallRecord(
        tool_name="search",
        arguments={"query": "refund"},
    )
    result = client.record_tool_call("span-1", tool_call)
    assert result["tool_name"] == "search"
    assert result["span_id"] == "span-1"


@responses.activate
def test_record_artifact(client):
    responses.post(
        "http://localhost:8000/api/v1/artifacts",
        json={"artifact_id": "art-1"},
        status=200,
    )

    artifact = ArtifactInput(
        artifact_type="pdf",
        mime_type="application/pdf",
        filename="policy.pdf",
    )
    result = client.record_artifact("run-123", artifact)
    assert result["artifact_id"] == "art-1"


@responses.activate
def test_record_annotation(client):
    responses.post(
        "http://localhost:8000/api/v1/annotations",
        json={"annotation_id": "ann-1"},
        status=200,
    )

    annotation = AnnotationInput(label="stale_source", note="Old policy used")
    result = client.record_annotation("run-123", annotation)
    assert result["annotation_id"] == "ann-1"


def test_close(client):
    client.close()

