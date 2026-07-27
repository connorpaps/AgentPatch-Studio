"""Tests for the /api/v1/artifacts/upload route (S3/MinIO upload is monkeypatched)."""

import json
import os

os.environ.setdefault("DATABASE_URL", "sqlite:///./test_agentpatch_artifacts.db")
os.environ.setdefault("AGENTPATCH_API_KEY", "test-key")
os.environ.setdefault("AGENTPATCH_TASK_ALWAYS_EAGER", "true")

from fastapi.testclient import TestClient

from app.api.v1 import artifacts as artifacts_module
from app.db import Base, engine
from app.main import app
from app.services import storage as storage_module

client = TestClient(app)
AUTH = {"Authorization": f"Bearer test-key"}


def setup_module():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def teardown_module():
    engine.dispose()
    try:
        Base.metadata.drop_all(bind=engine)
    except Exception:
        pass
    for fname in ("./test_agentpatch_artifacts.db",):
        try:
            os.remove(fname)
        except (FileNotFoundError, PermissionError):
            pass


def _seed_run() -> str:
    response = client.post(
        "/api/v1/runs/start",
        json={"workflow_name": "artifact-test", "environment": "test", "input": {"user_query": "artifact"}},
        headers=AUTH,
    )
    assert response.status_code == 200, response.text
    return response.json()["run_id"]


def test_artifact_upload_uses_storage_service(monkeypatch):
    captured = {}

    def fake_upload_bytes(key: str, data: bytes, content_type: str | None = None) -> str:
        captured["key"] = key
        captured["size"] = len(data)
        captured["content_type"] = content_type
        return f"s3://agentbucket/{key}"

    monkeypatch.setattr(storage_module, "upload_bytes", fake_upload_bytes)
    monkeypatch.setattr(artifacts_module, "upload_bytes", fake_upload_bytes)

    run_id = _seed_run()
    upload_resp = client.post(
        "/api/v1/artifacts/upload",
        data={
            "run_id": run_id,
            "artifact_type": "screenshot",
            "metadata_json": json.dumps({"source": "ci"}),
        },
        files={"file": ("dashboard.png", b"\x89PNG\r\n\x1a\n", "image/png")},
        headers=AUTH,
    )
    assert upload_resp.status_code == 200, upload_resp.text
    body = upload_resp.json()
    assert body["storage_url"].startswith("s3://agentbucket/")
    assert captured["key"].startswith(run_id)
    assert captured["content_type"] == "image/png"
    assert captured["size"] > 0
    detail = client.get(f"/api/v1/runs/{run_id}", headers=AUTH).json()
    artifacts = detail.get("artifacts") or []
    assert len(artifacts) == 1
    metadata = artifacts[0].get("metadata") or {}
    assert metadata.get("source") == "ci"
