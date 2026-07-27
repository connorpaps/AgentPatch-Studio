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

    app.add_middleware(
        CORSMiddleware,
        allow_origins=os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(","),
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
    if os.getenv("AUTO_CREATE_TABLES", "false").lower() == "true":
        Base.metadata.create_all(bind=engine)
