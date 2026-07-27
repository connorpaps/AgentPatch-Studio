"""Tests for the /replays/{run_id} endpoint covering metadata, partial, and full modes."""

import os

os.environ.setdefault("DATABASE_URL", "sqlite:///./test_agentpatch_replays.db")
os.environ.setdefault("AGENTPATCH_API_KEY", "test-key")
os.environ.setdefault("AGENTPATCH_TASK_ALWAYS_EAGER", "true")
os.environ.setdefault("LLM_PROVIDER", "mock")
os.environ.setdefault("ALLOW_FULL_REPLAY", "true")

from fastapi.testclient import TestClient

from app.db import Base, engine
from app.main import app

client = TestClient(app)
AUTH = {"Authorization": "Bearer test-key"}
JSON_HEADERS = {**AUTH, "Content-Type": "application/json"}


def setup_module():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def teardown_module():
    engine.dispose()
    try:
        Base.metadata.drop_all(bind=engine)
    except Exception:
        pass
    for fname in ("./test_agentpatch_replays.db",):
        try:
            os.remove(fname)
        except (FileNotFoundError, PermissionError):
            pass


def _seed_run_with_tool_span() -> str:
    response = client.post(
        "/api/v1/runs/start",
        json={"workflow_name": "replay-test", "environment": "test", "input": {"user_query": "replay me"}},
        headers=JSON_HEADERS,
    )
    assert response.status_code == 200
    run_id = response.json()["run_id"]

    model = client.post(
        "/api/v1/spans",
        json={
            "run_id": run_id,
            "span_type": "model_call",
            "name": "generate",
            "input_payload": {"prompt": "say something"},
        },
        headers=JSON_HEADERS,
    )
    assert model.status_code == 200
    model_id = model.json()["span_id"]
    client.post(
        f"/api/v1/spans/{model_id}/end",
        json={
            "status": "ok",
            "output_payload": {"answer": "hello"},
            "metrics": {"input_tokens": 10, "output_tokens": 5, "estimated_cost_usd": 0.0005},
        },
        headers=JSON_HEADERS,
    )

    tool = client.post(
        "/api/v1/spans",
        json={
            "run_id": run_id,
            "span_type": "tool_call",
            "name": "calculator",
            "input_payload": {"expression": "2+2"},
        },
        headers=JSON_HEADERS,
    )
    assert tool.status_code == 200
    tool_id = tool.json()["span_id"]
    # Patch span.tool_name via /tool-calls so replay.py can dispatch read-only tools.
    client.post(
        "/api/v1/tool-calls",
        json={
            "span_id": tool_id,
            "run_id": run_id,
            "tool_name": "calculator",
            "arguments": {"expression": "2+2"},
            "result": {"result": 4},
            "status": "ok",
            "duration_ms": 5,
        },
        headers=JSON_HEADERS,
    )

    client.post(
        f"/api/v1/runs/{run_id}/end",
        json={"status": "success", "output": {"answer": "hello"}},
        headers=JSON_HEADERS,
    )
    return run_id


def test_replay_metadata():
    run_id = _seed_run_with_tool_span()
    response = client.post(
        f"/api/v1/replays/{run_id}",
        data={"mode": "metadata"},
        headers=AUTH,
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["mode"] == "sync"
    assert body["result"]["mode"] == "metadata"
    assert body["result"]["new_run_id"] != run_id


def test_replay_partial():
    run_id = _seed_run_with_tool_span()
    response = client.post(
        f"/api/v1/replays/{run_id}",
        data={"mode": "partial"},
        headers=AUTH,
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["mode"] == "sync"
    assert body["result"]["mode"] == "partial"
    assert body["result"]["new_run_id"] != run_id


def test_replay_full_with_allow_flag():
    run_id = _seed_run_with_tool_span()
    response = client.post(
        f"/api/v1/replays/{run_id}",
        data={"mode": "full"},
        headers=AUTH,
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["mode"] == "sync"
    assert body["result"]["mode"] == "full"


def test_replay_invalid_mode():
    run_id = _seed_run_with_tool_span()
    response = client.post(
        f"/api/v1/replays/{run_id}",
        data={"mode": "weird"},
        headers=AUTH,
    )
    assert response.status_code == 400
