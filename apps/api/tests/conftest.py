"""Pytest configuration for the agentpatch-api test suite.

The rate-limiter middleware in ``apps/api/app/middleware/ratelimit.py`` runs
*inside* the test process whenever a ``fastapi.testclient.TestClient`` is
used (the middleware is mounted on the real ``app`` and the TestClient
requests flow through it). Without an explicit reset the very first test
that loops over an endpoint would exhaust the bucket for ``127.0.0.1`` and
every subsequent test would get a 429 from the limiter instead of a real
result.

The autouse fixture below wipes the limiter's bucket map before every
test so each test sees a clean quota. The dedicated rate-limit test in
``test_ratelimit.py`` opts out of this reset via ``autouse=False`` so it
can verify the 61st call returns 429 end-to-end.
"""

from __future__ import annotations

import pytest

from app.middleware.ratelimit import reset_all_buckets


@pytest.fixture(autouse=True)
def _reset_rate_limit_between_tests() -> None:
    """Clear the per-IP sliding-window buckets before every test.

    Cheap (just a dict.clear()), runs in microseconds, and the safety it
    buys -- no false-positive 429s bleeding across tests -- is worth more
    than the per-test overhead.
    """
    reset_all_buckets()
    yield
    reset_all_buckets()
