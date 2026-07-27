"""Tests for the /tasks/{task_id} endpoint."""

import os

os.environ.setdefault("DATABASE_URL", "sqlite:///./test_agentpatch_tasks.db")
os.environ.setdefault("AGENTPATCH_API_KEY", "test-key")
os.environ.setdefault("AGENTPATCH_TASK_ALWAYS_EAGER", "true")
os.environ.setdefault("LLM_PROVIDER", "mock")

from fastapi.testclient import TestClient

from app.db import Base, engine
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
    for fname in ("./test_agentpatch_tasks.db",):
        try:
            os.remove(fname)
        except (FileNotFoundError, PermissionError):
            pass


def test_eager_dispatch_returns_synchronous_result():
    # In eager mode (test default) the task returns a result immediately with
    # status SUCCESS.
    response = client.get("/api/v1/tasks/some-fake-id", headers=HEADERS)
    assert response.status_code == 200
    body = response.json()
    # The endpoint should report something coherent without raising.
    assert "task_id" in body
    assert "status" in body
    assert "ready" in body


def test_summarize_dispatch_returns_synchronous_metadata():
    response = client.post(
        "/api/v1/runs/start",
        json={"workflow_name": "task-test", "environment": "test", "input": {"user_query": "test"}},
        headers=HEADERS,
    )
    assert response.status_code == 200
    run_id = response.json()["run_id"]
    client.post(
        f"/api/v1/runs/{run_id}/end",
        json={"status": "success", "output": {"answer": "ok"}},
        headers=HEADERS,
    )

    response = client.post(f"/api/v1/runs/{run_id}/summarize", headers=HEADERS)
    assert response.status_code == 200
    body = response.json()
    assert body["execution"]["mode"] == "sync"
    assert body["execution"]["run_id"] == run_id
