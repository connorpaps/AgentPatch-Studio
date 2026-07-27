"""Health check endpoint that probes Postgres + Redis.

``GET /api/v1/health`` returns:
    {
        "status": "ok" | "degraded",
        "version": "0.1.0",
        "checks": {
            "postgres": {"status": "ok", "latency_ms": 4},
            "redis":    {"status": "ok"|"skipped"|"down", "latency_ms": ...}
        }
    }

A 503 is returned when the Postgres probe fails because the API is effectively
unusable in that state.
"""

import os
import time
from typing import Dict

from fastapi import APIRouter, Response, status
from sqlalchemy import text

from app.db import engine


router = APIRouter(tags=["health"])


def _probe_postgres() -> Dict[str, object]:
    started = time.perf_counter()
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        elapsed_ms = round((time.perf_counter() - started) * 1000, 2)
        return {"status": "ok", "latency_ms": elapsed_ms}
    except Exception as exc:  # pragma: no cover - defensive
        return {"status": "down", "error": str(exc)}


def _probe_redis() -> Dict[str, object]:
    url = os.getenv("REDIS_URL")
    if not url:
        return {"status": "skipped", "reason": "REDIS_URL not configured"}
    try:
        import redis

        client = redis.Redis.from_url(url, socket_connect_timeout=2)
        started = time.perf_counter()
        ok = client.ping()
        elapsed_ms = round((time.perf_counter() - started) * 1000, 2)
        return {"status": "ok" if ok else "down", "latency_ms": elapsed_ms}
    except ImportError:  # pragma: no cover - optional dep
        return {"status": "skipped", "reason": "redis package not installed"}
    except Exception as exc:  # pragma: no cover
        return {"status": "down", "error": str(exc)}


@router.get("/health")
def health(response: Response):
    checks = {"postgres": _probe_postgres(), "redis": _probe_redis()}
    overall = "ok"
    if checks["postgres"]["status"] != "ok":
        overall = "down"
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    elif checks["redis"]["status"] == "down":
        overall = "degraded"
    return {
        "status": overall,
        "version": os.getenv("APP_VERSION", "0.1.0"),
        "checks": checks,
    }
