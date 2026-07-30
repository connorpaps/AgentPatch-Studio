import os
import sys

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from app.middleware.ratelimit import HTTPException, check_general_limit

# Load local .env so environment variables are available when uvicorn is started
# without an explicit --env-file flag.
load_dotenv()

from app.api.v1 import (
    analytics,
    annotations,
    artifacts,
    auth,
    compare,
    evals,
    health,
    ingest,
    projects,
    replays,
    retrievals,
    runs,
    spans,
    tasks,
    tool_calls,
    workflows,
)
from app.db import Base, engine


def create_app() -> FastAPI:
    # Gate the OpenAPI surface on environment. /docs and /openapi.json
    # enumerate every endpoint + parameter schema for an attacker who can
    # reach the API; we keep them on for local dev and staging so engineers
    # can browse the contract, and we strip them in production so the
    # public deploy leaks no attack surface beyond the actual routes.
    is_production = os.getenv("AGENTPATCH_ENV") == "production"

    app = FastAPI(
        title="AgentPatch Studio API",
        version="0.1.0",
        description=(
            "Debugging, replay, comparison, and evaluation platform for AI agents."
            if not is_production
            else "AgentPatch Studio API."
        ),
        docs_url=None if is_production else "/docs",
        openapi_url=None if is_production else "/openapi.json",
    )

    # Per-IP rate limit (60/min generic, 10/min on /auth/demo).
    # CRITICAL ordering: register this FIRST so it is INNER (Starlette
    # stacks middleware in reverse-of-add order, so the LAST-registered
    # middleware runs FIRST on each request). CORS is added BELOW it
    # and therefore becomes the OUTER class-based layer that
    # short-circuits OPTIONS preflights with their Access-Control-*
    # headers BEFORE the limiter sees the request. Real GET/POST still
    # reaches the limiter on the way in.
    #
    # Tighter limits on /auth/demo are layered on top as a per-route
    # Depends so this middleware stays generic for the rest of the API.
    class _RateLimitMiddleware(BaseHTTPMiddleware):
        async def dispatch(self, request: Request, call_next):
            try:
                check_general_limit(request)
            except HTTPException as exc:
                return JSONResponse(
                    status_code=exc.status_code,
                    content={"detail": exc.detail},
                    headers=exc.headers or {},
                )
            return await call_next(request)

    app.add_middleware(_RateLimitMiddleware)

    # CORS: comma-separated origins from FRONTEND_ORIGIN (preferred) or
    # ALLOWED_ORIGINS (legacy). allow_credentials=True so the demo JWT
    # cookie rides the cross-origin fetch; allow_origins must never be "*"
    # when credentials are true (browsers reject the combination).
    #
    # CRITICAL: do NOT iterate os.getenv() directly. When FRONTEND_ORIGIN is
    # set, the `or` short-circuits to the URL string and the comprehension
    # yields one-char origins (e.g. ['h','t','t','p','s',':','/',...]). See
    # apps/api/tests/test_cors_origins.py for the regression test.
    raw_origins = (
        os.getenv("FRONTEND_ORIGIN")
        or os.getenv("ALLOWED_ORIGINS", "http://localhost:3000")
    )
    origins = [o.strip() for o in raw_origins.split(",") if o.strip()]
    # Register AFTER _RateLimitMiddleware so CORS sits OUTER and short-
    # circuits OPTIONS preflights without taxing the user's bucket.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Loud, visible warning when CORS will silently break the deploy.
    # Without this the developer only discovers the problem when the browser
    # console fills with "Access to fetch at '...' has been blocked by CORS
    # policy" errors -- which is what bit us on the production deploy.
    # We log to stderr so the line shows up in Render's deploy logs.
    if is_production and not os.getenv("FRONTEND_ORIGIN"):
        print(
            "[agentpatch] WARNING: AGENTPATCH_ENV=production but "
            "FRONTEND_ORIGIN is unset. CORS will only allow "
            f"{origins!r}; cross-origin fetches from your deployed web "
            "origin will be browser-blocked. Set FRONTEND_ORIGIN to the "
            "deployed front-end URL (no trailing slash) in Render env.",
            file=sys.stderr,
            flush=True,
        )

    # Security headers applied to every response (including CORS preflight
    # replies and rate-limit 429s). setdefault() so a route that already
    # set its own header wins; we only fill in defaults.
    @app.middleware("http")
    async def _security_headers(request: Request, call_next):
        response = await call_next(request)
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault(
            "Referrer-Policy", "strict-origin-when-cross-origin"
        )
        response.headers.setdefault(
            "Permissions-Policy", "geolocation=(), camera=(), microphone=()"
        )
        return response

    app.include_router(health.router, prefix="/api/v1")
    app.include_router(projects.router, prefix="/api/v1")
    app.include_router(auth.router, prefix="/api/v1")
    app.include_router(runs.router, prefix="/api/v1")
    app.include_router(analytics.router, prefix="/api/v1")
    app.include_router(ingest.router, prefix="/api/v1")
    app.include_router(spans.router, prefix="/api/v1")
    app.include_router(tool_calls.router, prefix="/api/v1")
    app.include_router(retrievals.router, prefix="/api/v1")
    app.include_router(artifacts.router, prefix="/api/v1")
    app.include_router(workflows.router, prefix="/api/v1")
    app.include_router(compare.router, prefix="/api/v1")
    app.include_router(annotations.router, prefix="/api/v1")
    app.include_router(evals.router, prefix="/api/v1")
    app.include_router(replays.router, prefix="/api/v1")
    app.include_router(tasks.router, prefix="/api/v1")

    return app


app = create_app()


@app.on_event("startup")
def startup():
    # Ensure schema exists in any environment that didn't run Alembic
    # (Render's free tier doesn't expose a pre-deploy command for free
    # Docker services, so create_all here is the safety net).
    if os.getenv("AUTO_CREATE_TABLES", "false").lower() == "true":
        Base.metadata.create_all(bind=engine)
