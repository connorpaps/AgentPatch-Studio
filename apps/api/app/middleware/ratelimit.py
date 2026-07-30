"""In-memory sliding-window per-IP rate limiter.

Two entry points are exported:

- ``check_general_limit(request)`` -- 60 req/min per IP across all endpoints.
  Wired as a Starlette ``BaseHTTPMiddleware`` in ``main.py`` so it covers
  every route without needing to annotate each one. Counts requests at the
  edge of the app, before CORS preflights are passed through.

- ``check_demo_session_limit(request)`` -- 10 req/min per IP, applied as
  a FastAPI ``Depends`` on ``POST /api/v1/auth/demo`` only. Tighter than
  the general limit so a recruiter's first click lands at a normal speed
  but a script farming the demo session can't mint hundreds of cookies.

Both use a ``defaultdict(deque)`` of timestamp floats. We prune entries
older than ``_WINDOW_SECONDS`` on every check so the deque per-IP stays
bounded; the universe of IPs visible to a single worker dictates the
absolute worst-case memory.

Single-worker statefulness is the deliberate trade-off for the Render
free-tier deploy:

- Render free = 1 uvicorn worker, so in-memory state covers the entire
  served traffic. There is no Redis hop on the hot path.
- A multi-worker upgrade (Render Standard) would degrade this into a
  per-worker bucket. That's acceptable for a recruiter demo -- the worst
  outcome is a slightly looser limit, not a security regression.
- If a hard guarantee is needed later, swap ``_WINDOWS`` for a Redis
  ``INCR`` + ``EXPIRE`` pair (Redis is already in ``requirements.txt``).
  The ``check_*_limit`` signatures would not change.

X-Forwarded-For handling: when behind Render (or another reverse proxy)
``request.client.host`` is the proxy IP, so every recruiter lands in the
same bucket. We prefer the left-most IP from ``X-Forwarded-For`` -- the
proxy chain appends, so the left-most is the original client. If the
header is absent we fall back to ``request.client.host``. A client
*can* spoof XFF when talking to us directly, but for a portfolio demo
the practical risk is "absolutely every recruiter sharing one quota",
which is worse than the theoretical spoof risk.

Reduced-motion / accessibility: not applicable. This module is server-side
timing logic and has no UI surface.
"""

from __future__ import annotations

import time
from collections import defaultdict, deque
from typing import Deque, Dict

from fastapi import HTTPException, Request, status


_WINDOW_SECONDS = 60.0
_GENERAL_LIMIT = 60      # 60/min per IP across the whole API surface.
_DEMO_LIMIT = 10         # 10/min per IP for the demo session-mint endpoint.

# Two key namespaces so the same IP doesn't accidentally share a bucket
# between /auth/demo (counted under 'demo:') and the general middleware
# (counted under 'ip:'). Defaultdict auto-creates entries on access.
_WINDOWS: Dict[str, Deque[float]] = defaultdict(deque)


def _ip_for(request: Request) -> str:
    """Resolve the *effective* client IP behind one or more proxies.

    Preference order: left-most entry in ``X-Forwarded-For`` (the original
    client, per the proxy chain convention) -> falling back to
    ``request.client.host`` when no forwarded header is present.
    """
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        # ``X-Forwarded-For`` may be a comma-separated list. The first entry
        # is the original client; later entries are intermediate proxies.
        first = forwarded.split(",", 1)[0].strip()
        if first:
            return first
    peer = request.client
    return peer.host if peer else "unknown"


def _prune(window: Deque[float], now: float) -> None:
    while window and now - window[0] > _WINDOW_SECONDS:
        window.popleft()


def _hit(bucket_key: str, limit: int) -> None:
    """Record a request against ``bucket_key``; raise 429 when over limit."""
    now = time.time()
    # defaultdict.__getitem__ creates a fresh deque for an unseen key.
    window = _WINDOWS[bucket_key]
    _prune(window, now)
    if len(window) >= limit:
        # Retry-after is anchored to the oldest in-window timestamp; once
        # it slides out the caller has a fresh slot.
        retry = max(1, int(_WINDOW_SECONDS - (now - window[0])))
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=(
                f"Too many requests from this IP. "
                f"Limit is {limit} per {_WINDOW_SECONDS:.0f}s. "
                f"Retry in {retry}s."
            ),
            headers={"Retry-After": str(retry)},
        )
    window.append(now)


def check_general_limit(request: Request) -> None:
    """60 req/min per IP for the whole API surface. Raises 429 over the cap."""
    _hit(f"ip:{_ip_for(request)}", _GENERAL_LIMIT)


def check_demo_session_limit(request: Request) -> None:
    """10 req/min per IP for /auth/demo. Raises 429 over the cap."""
    _hit(f"demo:{_ip_for(request)}", _DEMO_LIMIT)


def reset_all_buckets() -> None:
    """Test-only helper: wipe every IP's bucket between tests.

    Imported by ``tests/conftest.py`` so the in-process middleware that
    covers the test client doesn't bleed quota between test functions and
    turn the suite into one giant 429 cascade.
    """
    _WINDOWS.clear()


__all__ = [
    "check_general_limit",
    "check_demo_session_limit",
    "reset_all_buckets",
]
