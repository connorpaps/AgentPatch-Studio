"""Tests for the /projects/* endpoints."""

import os

os.environ.setdefault("DATABASE_URL", "sqlite:///./test_agentpatch_projects.db")
os.environ.setdefault("AGENTPATCH_API_KEY", "test-key")
os.environ.setdefault("AGENTPATCH_TASK_ALWAYS_EAGER", "true")

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
    for fname in ("./test_agentpatch_projects.db",):
        try:
            os.remove(fname)
        except (FileNotFoundError, PermissionError):
            pass


def test_get_me_creates_default_project():
    response = client.get("/api/v1/projects/me", headers=HEADERS)
    assert response.status_code == 200
    body = response.json()
    assert body["slug"] == "default"
    assert body["capture_mode"] == "full"


def test_update_me_capture_mode_and_name():
    response = client.put(
        "/api/v1/projects/me",
        json={"name": "Workspace A", "capture_mode": "redacted"},
        headers=HEADERS,
    )
    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "Workspace A"
    assert body["capture_mode"] == "redacted"

    again = client.get("/api/v1/projects/me", headers=HEADERS)
    assert again.status_code == 200
    assert again.json()["capture_mode"] == "redacted"


def test_update_me_rejects_invalid_capture_mode():
    response = client.put(
        "/api/v1/projects/me",
        json={"capture_mode": "bogus"},
        headers=HEADERS,
    )
    assert response.status_code == 400


def test_list_projects_returns_at_least_me():
    response = client.get("/api/v1/projects", headers=HEADERS)
    assert response.status_code == 200
    body = response.json()
    assert isinstance(body, list)
    assert any(p["slug"] == "default" for p in body)
    # /projects should keep api_key private.
    for project in body:
        assert project.get("api_key") is None
