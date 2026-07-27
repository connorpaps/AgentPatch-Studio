"""Tests for the rich /api/v1/health endpoint."""

import os

os.environ.setdefault("DATABASE_URL", "sqlite:///./test_agentpatch_health.db")
os.environ.setdefault("AGENTPATCH_API_KEY", "test-key")

from fastapi.testclient import TestClient

from app.db import Base, engine
from app.main import app

client = TestClient(app)


def setup_module():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def teardown_module():
    engine.dispose()
    try:
        Base.metadata.drop_all(bind=engine)
    except Exception:
        pass
    for fname in ("./test_agentpatch_health.db",):
        try:
            os.remove(fname)
        except (FileNotFoundError, PermissionError):
            pass


def test_health_reports_version_and_checks():
    response = client.get("/api/v1/health")
    # Postgres probe with SQLite succeeds via SELECT 1.
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert "version" in body
    checks = body["checks"]
    assert checks["postgres"]["status"] == "ok"
    # Redis is skipped if REDIS_URL is not set.
    assert checks["redis"]["status"] in {"skipped", "ok", "down"}
    if "latency_ms" in checks["postgres"]:
        assert isinstance(checks["postgres"]["latency_ms"], (int, float))


def test_health_redis_reported_when_url_set(monkeypatch):
    # Stub the optional redis import path: monkeypatch env URL and the probe fn directly.
    monkeypatch.setenv("REDIS_URL", "redis://localhost:6379/0")
    monkeypatch.setitem(__import__("sys").modules, "redis", None)

    response = client.get("/api/v1/health")
    assert response.status_code == 200
    body = response.json()
    # redis package is unavailable in this test env so it should report 'skipped'.
    assert body["checks"]["redis"]["status"] == "skipped"
