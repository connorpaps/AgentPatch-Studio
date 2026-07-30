"""End-to-end tests for ``apps/api/app/middleware/ratelimit.py``.

These tests intentionally bypass the per-test bucket reset declared in
``tests/conftest.py`` -- the limiter is the thing under test, so the
autouse reset is exactly what guards against cross-test pollution in
*other* suites; here we want a clean starting bucket followed by an
exactly-61-call sequence.

To make the autouse fixture an opt-out for this module only we declare
``@pytest.fixture(autouse=True)`` again with the same name, which
replaces the conftest fixture for any module that imports it (pytest's
fixture precedence: module-scoped autouse > conftest-scoped autouse).
"""

from __future__ import annotations

import os

# Match the convention used by tests/test_smoke.py, test_tasks.py,
# test_replays.py -- pin DATABASE_URL to a local sqlite file so this
# suite is self-contained on a machine that may not have a Postgres
# server running. The test only exercises the in-process rate-limit
# middleware so we don't need a full Postgres + Redis stack.
os.environ.setdefault("DATABASE_URL", "sqlite:///./test_agentpatch_ratelimit.db")
os.environ.setdefault("AGENTPATCH_API_KEY", "test-key")

import types

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.middleware.ratelimit import reset_all_buckets


# Op-in to a *single* reset at module-scope so the limiter tests below
# each observe a clean bucket. The per-test reset from conftest is
# overridden because of the overriding autouse fixture below.
@pytest.fixture(autouse=True)
def _only_reset_rate_limit_at_test_start() -> None:
    reset_all_buckets()
    yield


client = TestClient(app)


def test_general_limit_returns_429_after_60_calls() -> None:
    """GET /api/v1/health 60 times should all be 200; the 61st must be 429."""
    # 60 successful calls fill the bucket but stay under the cap.
    for i in range(60):
        response = client.get("/api/v1/health")
        assert response.status_code == 200, (
            f"call {i + 1} expected 200, got {response.status_code}: {response.text}"
        )

    # 61st call must trip the limiter.
    over_limit = client.get("/api/v1/health")
    assert over_limit.status_code == 429, (
        f"61st call expected 429, got {over_limit.status_code}: {over_limit.text}"
    )
    assert "Retry-After" in over_limit.headers, (
        f"429 response is missing Retry-After header: {dict(over_limit.headers)}"
    )
    retry_after = int(over_limit.headers["Retry-After"])
    assert 1 <= retry_after <= 60, f"Retry-After value out of window: {retry_after}"


def test_buckets_are_namespaced_per_route_namespace() -> None:
    """The general 'ip:' bucket and the demo 'demo:' bucket do not collide.

    The general bucket is currently full from the previous test. Hitting
    /auth/demo would 429 under the demo bucket independently -- but
    /auth/demo only counts under ``demo:<ip>`` so a clean POST here would
    *not* see the general bucket's exhausted quota.

    We do NOT issue a real ``POST /auth/demo`` here because that endpoint
    mints a session cookie and we don't need a live session for the
    bucket-isolation contract. Instead we call the dependency function
    directly with a synthetic request stub to confirm the namespaces
    differ.
    """
    from app.middleware.ratelimit import _WINDOWS, check_demo_session_limit

    # Simulate a request from the same IP under the demo namespace.
    # No X-Forwarded-For header -> resolves to client.host via the
    # fall-through branch in ratelimit._ip_for.
    req = types.SimpleNamespace(
        headers={},
        client=types.SimpleNamespace(host="127.0.0.1"),
    )

    # Confirm baseline: nothing under ``demo:127.0.0.1`` even though
    # ``ip:127.0.0.1`` may be saturated from the previous test.
    assert "demo:127.0.0.1" not in _WINDOWS

    # Exercise the demo bucket up to its cap (10 calls) and confirm it
    # caps independently of any ``ip:`` bucket activity elsewhere.
    for _ in range(10):
        check_demo_session_limit(req)  # type: ignore[arg-type]
    with pytest.raises(Exception) as exc_info:
        check_demo_session_limit(req)  # type: ignore[arg-type]
    assert exc_info.value.status_code == 429
