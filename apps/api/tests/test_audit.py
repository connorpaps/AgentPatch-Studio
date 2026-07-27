"""Tests for the /projects/{id}/audit-logs endpoint."""

import os

os.environ.setdefault("DATABASE_URL", "sqlite:///./test_agentpatch_audit.db")
os.environ.setdefault("AGENTPATCH_API_KEY", "test-key")
os.environ.setdefault("AGENTPATCH_TASK_ALWAYS_EAGER", "true")

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
    for fname in ("./test_agentpatch_audit.db",):
        try:
            os.remove(fname)
        except (FileNotFoundError, PermissionError):
            pass


def _seed_run() -> str:
    response = client.post("/api/v1/runs/start", headers=HEADERS, json={"workflow_name": "audit-test", "environment": "test"})
    assert response.status_code == 200
    return response.json()["run_id"]


def _project_id() -> str:
    response = client.get("/api/v1/projects/me", headers=HEADERS)
    assert response.status_code == 200
    return response.json()["id"]


def test_audit_log_captures_review_and_annotations():
    project_id = _project_id()
    run_id = _seed_run()

    patch_resp = client.patch(
        f"/api/v1/runs/{run_id}/review-status",
        params={"requires_review": "true"},
        headers=HEADERS,
    )
    assert patch_resp.status_code == 200

    annotation_resp = client.post(
        "/api/v1/annotations",
        json={"run_id": run_id, "label": "needs_review", "note": "Looks suspicious."},
        headers=HEADERS,
    )
    assert annotation_resp.status_code == 200

    response = client.get(
        f"/api/v1/projects/{project_id}/audit-logs",
        params={"resource_id": run_id},
        headers=HEADERS,
    )
    assert response.status_code == 200
    body = response.json()
    actions = {entry["action"] for entry in body}
    assert "update_review_status" in actions
    assert "create_annotation" in actions
    for entry in body:
        assert entry["resource_id"] == run_id


def test_audit_log_filters_by_action():
    project_id = _project_id()
    run_id = _seed_run()

    client.patch(
        f"/api/v1/runs/{run_id}/review-status",
        params={"requires_review": "true"},
        headers=HEADERS,
    )

    response = client.get(
        f"/api/v1/projects/{project_id}/audit-logs",
        params={"action": "update_review_status"},
        headers=HEADERS,
    )
    assert response.status_code == 200
    body = response.json()
    assert all(entry["action"] == "update_review_status" for entry in body)
    assert len(body) >= 1
