"""Tests for the Phase 2 auth flow: magic link + demo + whoami."""

import json
import os

# Set DB + JWT secret BEFORE importing the app.
os.environ.setdefault("DATABASE_URL", "sqlite:///./test_agentpatch_auth.db")
os.environ.setdefault("AGENTPATCH_API_KEY", "test-key")
os.environ.setdefault("AGENTPATCH_JWT_SECRET", "test-jwt-secret")
os.environ.setdefault("AGENTPATCH_TASK_ALWAYS_EAGER", "true")
os.environ.setdefault("AGENTPATCH_ENV", "development")

from http.cookies import SimpleCookie
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db import Base, get_db
from app.main import app
from app.models import (  # noqa: F401 — register all tables with Base.metadata
    Annotation,
    Artifact,
    AuditLog,
    Environment,
    EvalCase,
    EvalResult,
    MagicLinkToken,
    Project,
    ProjectMember,
    RetrievedDocument,
    Run,
    Span,
    User,
    Workflow,
)


@pytest.fixture()
def db_engine():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    yield engine
    engine.dispose()


@pytest.fixture()
def client(db_engine):
    TestSessionLocal = sessionmaker(
        bind=db_engine, autoflush=False, expire_on_commit=False
    )

    def _override_get_db():
        session = TestSessionLocal()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def _cookies_to_dict(response) -> dict[str, str]:
    """Extract Set-Cookie values directly from the raw header.

    httpx.TestClient doesn't always expose cookies via ``response.cookies``
    when the Set-Cookie header lacks an explicit domain (``http://testserver``),
    so iterating ``response.cookies`` can return an empty jar. Parse the raw
    ``set-cookie`` header with ``http.cookies.SimpleCookie`` instead, which
    doesn't depend on domain/path matching.
    """
    raw = response.headers.get("set-cookie", "")
    if not raw:
        return {}
    jar = SimpleCookie()
    jar.load(raw)
    return {name: morsel.value for name, morsel in jar.items()}


def _read_latest_dev_token(email: str) -> str | None:
    from app.services.auth import email_log_path

    mailbox = Path(email_log_path())
    if not mailbox.exists():
        return None
    last: str | None = None
    for line in mailbox.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            record = json.loads(line)
        except ValueError:
            continue
        if record.get("email", "").lower() != email.lower():
            continue
        if record.get("token"):
            last = record["token"]
    return last


def _mailbox_lines():
    from app.services.auth import email_log_path

    mailbox = Path(email_log_path())
    if not mailbox.exists():
        return []
    return [
        json.loads(line)
        for line in mailbox.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]


def test_demo_session_returns_cookie(client):
    response = client.post("/api/v1/auth/demo")
    assert response.status_code == 200
    body = response.json()
    assert body["principal"] == "demo"
    assert "agentpatch.demo" in response.headers.get("set-cookie", "")


def test_whoami_with_demo_cookie(client):
    response = client.post("/api/v1/auth/demo")
    assert response.status_code == 200
    cookies = _cookies_to_dict(response)
    response = client.get("/api/v1/auth/me", cookies=cookies)
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["principal"] == "demo"


def test_whoami_with_api_key_returns_key_principal(client):
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer test-key"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["principal"] == "api_key"


def test_whoami_anonymous_is_rejected_on_protected_routes(client):
    response = client.get("/api/v1/runs")
    assert response.status_code == 401


def test_logout_clears_cookies(client):
    client.post(
        "/api/v1/auth/magic-link/request",
        json={"email": "logout-test@example.com"},
    )
    token = _read_latest_dev_token(email="logout-test@example.com")
    assert token
    redeem = client.post(
        "/api/v1/auth/magic-link/redeem", json={"token": token}
    )
    assert redeem.status_code == 200
    cookies = _cookies_to_dict(redeem)

    response = client.post("/api/v1/auth/logout", cookies=cookies)
    assert response.status_code == 204
    set_cookie = response.headers.get("set-cookie", "")
    assert (
        "agentpatch.session" in set_cookie
        or "agentpatch.demo" in set_cookie
    )


def test_demo_token_scopes_are_read_only(client):
    response = client.post("/api/v1/auth/demo")
    assert response.status_code == 200
    cookies = _cookies_to_dict(response)
    response = client.get("/api/v1/auth/me", cookies=cookies)
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["principal"] == "demo"
    assert "runs:read" in body["scopes"]
    assert "runs:write" not in body["scopes"]


def test_magic_link_request_then_redeem(client):
    response = client.post(
        "/api/v1/auth/magic-link/request",
        json={"email": "demo-user@example.com"},
    )
    assert response.status_code == 204

    token = _read_latest_dev_token(email="demo-user@example.com")
    assert token is not None

    response = client.post(
        "/api/v1/auth/magic-link/redeem", json={"token": token}
    )
    assert response.status_code == 200
    body = response.json()
    assert body["principal"] == "session"
    assert body["subject"] == "demo-user@example.com"
    assert "agentpatch.session" in response.headers.get("set-cookie", "")


def test_magic_link_redeem_rejects_invalid_token(client):
    response = client.post(
        "/api/v1/auth/magic-link/redeem", json={"token": "not-a-real-token"}
    )
    assert response.status_code == 400


def test_session_and_demo_jwt_scopes_differ(client):
    response = client.post("/api/v1/auth/demo")
    assert response.status_code == 200
    demo_me = client.get(
        "/api/v1/auth/me", cookies=_cookies_to_dict(response)
    ).json()
    assert "runs:read" in demo_me["scopes"]
    assert "runs:write" not in demo_me["scopes"]

    session_response = client.post(
        "/api/v1/auth/magic-link/request",
        json={"email": "session-scopes@example.com"},
    )
    assert session_response.status_code == 204
    token = _read_latest_dev_token(email="session-scopes@example.com")
    assert token
    redeem = client.post(
        "/api/v1/auth/magic-link/redeem", json={"token": token}
    )
    assert redeem.status_code == 200
    session_me = client.get(
        "/api/v1/auth/me", cookies=_cookies_to_dict(redeem)
    ).json()
    assert session_me["principal"] == "session"
    assert "runs:write" in session_me["scopes"]


def test_dev_token_sample_filters_by_email(client):
    client.post(
        "/api/v1/auth/magic-link/request", json={"email": "alice@example.com"}
    )
    client.post(
        "/api/v1/auth/magic-link/request", json={"email": "bob@example.com"}
    )

    lines = _mailbox_lines()
    alice = [r for r in lines if r.get("email") == "alice@example.com"]
    bob = [r for r in lines if r.get("email") == "bob@example.com"]
    assert alice and bob
    assert alice[-1]["token"] != bob[-1]["token"]

    response = client.get("/api/v1/auth/magic-link/sample?email=alice@example.com")
    assert response.status_code == 200
    sample = response.json()
    assert sample["token"] == alice[-1]["token"]
    assert sample["email"] == "alice@example.com"
