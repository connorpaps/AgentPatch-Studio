import os

os.environ["DATABASE_URL"] = "sqlite:///./test_agentpatch.db"
os.environ["AGENTPATCH_API_KEY"] = "test-key"

from fastapi.testclient import TestClient

from app.db import Base, SessionLocal, engine
from app.main import app

client = TestClient(app)
API_KEY = "test-key"
HEADERS = {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}


def setup_module():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def teardown_module():
    engine.dispose()
    try:
        Base.metadata.drop_all(bind=engine)
    except Exception:
        pass
    if os.path.exists("./test_agentpatch.db"):
        try:
            os.remove("./test_agentpatch.db")
        except PermissionError:
            pass  # SQLite may still hold the file on Windows; temp file is cleaned later


def test_health():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert "version" in body
    assert "checks" in body
    assert body["checks"]["postgres"]["status"] == "ok"


def test_redaction_metadata_only():
    # Create a project in metadata_only mode and ensure user_query is redacted.
    from app.models import Project

    db = SessionLocal()
    project = db.query(Project).first()
    if project is None:
        project = Project(name="Default", slug="default", api_key=API_KEY, capture_mode="metadata_only")
        db.add(project)
        db.commit()
    project.capture_mode = "metadata_only"
    db.commit()
    db.close()

    try:
        start = client.post(
            "/api/v1/runs/start",
            json={
                "workflow_name": "redaction-test",
                "environment": "test",
                "input": {"user_query": "contact me at alice@example.com"},
            },
            headers=HEADERS,
        )
        assert start.status_code == 200
        run_id = start.json()["run_id"]

        detail = client.get(f"/api/v1/runs/{run_id}", headers=HEADERS)
        assert detail.status_code == 200
        assert detail.json()["user_query"] == "[REDACTED]"
    finally:
        # Restore full mode for other tests.
        db = SessionLocal()
        project = db.query(Project).first()
        if project:
            project.capture_mode = "full"
            db.commit()
        db.close()


def test_ingest_otlp():
    payload = {
        "resource_spans": [
            {
                "resource": {
                    "attributes": {
                        "service.name": "otlp-test",
                        "environment": "test",
                    }
                },
                "scope_spans": [
                    {
                        "spans": [
                            {
                                "span_id": "root-1",
                                "name": "run",
                                "status": "ok",
                                "started_at": "2024-01-01T00:00:00Z",
                                "ended_at": "2024-01-01T00:00:01Z",
                                "attributes": {
                                    "user_query": "Can I get a refund?",
                                    "span.type": "root",
                                },
                            },
                            {
                                "span_id": "span-1",
                                "parent_span_id": "root-1",
                                "name": "generate",
                                "status": "ok",
                                "started_at": "2024-01-01T00:00:00Z",
                                "ended_at": "2024-01-01T00:00:01Z",
                                "attributes": {
                                    "span.type": "model_call",
                                    "input": {"prompt": "answer the question"},
                                    "output": {"answer": "yes"},
                                },
                            },
                        ]
                    }
                ],
            }
        ]
    }
    response = client.post("/api/v1/ingest/otlp", json=payload, headers=HEADERS)
    assert response.status_code == 200
    data = response.json()
    assert len(data["run_ids"]) == 1


def test_analytics_cost_by_workflow():
    response = client.get("/api/v1/analytics/cost-by-workflow", headers=HEADERS)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


def test_suggest_failure_type_and_summarize():
    # Seed a failure run via the existing helper path.
    start = client.post(
        "/api/v1/runs/start",
        json={
            "workflow_name": "support-policy-agent",
            "environment": "test",
            "input": {"user_query": "Test failure"},
        },
        headers=HEADERS,
    )
    run_id = start.json()["run_id"]
    span = client.post(
        "/api/v1/spans",
        json={
            "run_id": run_id,
            "span_type": "model_call",
            "name": "generate_answer",
            "input_payload": {"prompt": "answer"},
        },
        headers=HEADERS,
    )
    span_id = span.json()["span_id"]
    client.post(
        f"/api/v1/spans/{span_id}/end",
        json={
            "status": "error",
            "output_payload": {"error": "timeout"},
        },
        headers=HEADERS,
    )
    client.post(
        f"/api/v1/runs/{run_id}/end",
        json={"status": "failure", "failure_type": "timeout"},
        headers=HEADERS,
    )

    suggest = client.post(f"/api/v1/runs/{run_id}/suggest-failure-type", headers=HEADERS)
    assert suggest.status_code == 200
    summary = client.post(f"/api/v1/runs/{run_id}/summarize", headers=HEADERS)
    assert summary.status_code == 200


def test_replay_metadata():
    # Create a self-contained successful run for replay.
    start = client.post(
        "/api/v1/runs/start",
        json={
            "workflow_name": "replay-test",
            "environment": "test",
            "input": {"user_query": "replay me"},
        },
        headers=HEADERS,
    )
    run_id = start.json()["run_id"]
    client.post(
        f"/api/v1/runs/{run_id}/end",
        json={"status": "success", "output": {"answer": "ok"}},
        headers=HEADERS,
    )
    replay = client.post(
        f"/api/v1/replays/{run_id}",
        data={"mode": "metadata"},
        headers={"Authorization": HEADERS["Authorization"]},
    )
    assert replay.status_code == 200
    body = replay.json()
    assert body["mode"] == "sync"
    assert body["result"]["mode"] == "metadata"
    assert body["result"]["new_run_id"] != run_id


def test_audit_log():
    from app.models import AuditLog

    response = client.get("/api/v1/runs?limit=1", headers=HEADERS)
    runs = response.json()
    if not runs:
        return
    run_id = runs[0]["id"]
    patch = client.patch(
        f"/api/v1/runs/{run_id}/review-status",
        params={"requires_review": "true"},
        headers=HEADERS,
    )
    assert patch.status_code == 200
    annotation = client.post(
        "/api/v1/annotations",
        json={"run_id": run_id, "label": "reviewed", "note": "looks good"},
        headers=HEADERS,
    )
    assert annotation.status_code == 200

    db = SessionLocal()
    try:
        logs = db.query(AuditLog).filter(AuditLog.resource_id == run_id).all()
        assert len(logs) >= 2
        actions = {log.action for log in logs}
        assert "update_review_status" in actions
        assert "create_annotation" in actions
    finally:
        db.close()


def test_run_lifecycle():
    start = client.post(
        "/api/v1/runs/start",
        json={
            "workflow_name": "support-policy-agent",
            "environment": "test",
            "input": {"user_query": "Can I get a refund for my annual plan?"},
        },
        headers=HEADERS,
    )
    assert start.status_code == 200
    data = start.json()
    run_id = data["run_id"]

    span = client.post(
        "/api/v1/spans",
        json={
            "run_id": run_id,
            "span_type": "retrieval",
            "name": "retrieve_policy_docs",
            "input_payload": {"query": "annual plan refund policy"},
        },
        headers=HEADERS,
    )
    assert span.status_code == 200
    span_id = span.json()["span_id"]

    client.post(
        "/api/v1/retrievals",
        json={
            "span_id": span_id,
            "documents": [
                {
                    "source_name": "refund-policy-2024.pdf",
                    "source_uri": "s3://docs/refund-policy-2024.pdf",
                    "rank": 1,
                    "score": 0.91,
                    "content_snippet": "Annual plans are refundable within 30 days.",
                }
            ],
        },
        headers=HEADERS,
    )

    client.post(
        "/api/v1/spans",
        json={
            "run_id": run_id,
            "span_type": "model_call",
            "name": "generate_answer",
            "input_payload": {"prompt": "Answer based on the retrieved policy."},
        },
        headers=HEADERS,
    )

    end = client.post(
        f"/api/v1/runs/{run_id}/end",
        json={
            "status": "success",
            "output": {"answer": "Yes, annual plans are refundable within 30 days."},
        },
        headers=HEADERS,
    )
    assert end.status_code == 200

    detail = client.get(f"/api/v1/runs/{run_id}", headers=HEADERS)
    assert detail.status_code == 200
    body = detail.json()
    assert body["status"] == "success"
    assert body["workflow_id"]
    assert len(body["spans"]) >= 2
