import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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
    app = FastAPI(
        title="AgentPatch Studio API",
        version="0.1.0",
        description="Debugging, replay, comparison, and evaluation platform for AI agents.",
    )

    # CORS: comma-separated origins from FRONTEND_ORIGIN (preferred) or
    # ALLOWED_ORIGINS (legacy). allow_credentials=True so the demo JWT
    # cookie rides the cross-origin fetch; allow_origins must never be "*"
    # when credentials are true (browsers reject the combination).
    origins = [
        o.strip()
        for o in os.getenv("FRONTEND_ORIGIN")
        or os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
        if o.strip()
    ]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

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
