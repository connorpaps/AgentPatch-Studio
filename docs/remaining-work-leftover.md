# AgentPatch Studio — Leftover Work for Next Session

This file contains the remaining items from `remaining_work.md` that still need to be implemented and wired up after the last session.

## Current State Summary

Stages 1–4 are implemented and passing tests/build:

- **Stage 1 — AI Insight Layer**: root-cause analysis, summarization, patch suggestions (backend + UI).
- **Stage 2 — Analytics & Clustering**: cost-by-workflow, slowest-spans, token-heavy-spans, similar-failures.
- **Stage 3 — OTLP & Artifacts**: OTLP ingestion adapter, S3/MinIO artifact upload, storage service.
- **Stage 4 — Partial Replay**: `mode=metadata|partial`, LLM re-runs model-call spans while reusing tool/retrieval outputs.

Stage 5 is **partially** done:

- `User`, `ProjectMember`, `AuditLog` models added.
- `Project.capture_mode` added.
- Redaction service created at `apps/api/app/services/redaction.py`.
- Auth updated to support a master API key bypass plus project-scoped API keys.
- Celery worker scaffolding added at `apps/api/app/worker.py`.

## ❌ Leftover Work

### 1. Wire Redaction into Ingestion

**Goal:** apply `Project.capture_mode` to incoming run/span/tool/artifact payloads.

**Files to touch:**
- `apps/api/app/api/v1/runs.py` (`start_run`, `end_run`)
- `apps/api/app/api/v1/spans.py` (`start_span`, `end_span`)
- `apps/api/app/api/v1/ingest.py` (OTLP adapter)
- `apps/api/app/services/redaction.py` (already exists)

**Concrete steps:**
1. Look up the project for the run (via API key → Project).
2. Before storing `user_query`, `final_output`, `input_payload`, `output_payload`, apply `apply_capture_mode(..., project.capture_mode)`.
3. For `metadata_only`, replace content fields with `"[REDACTED]"`.
4. For `redacted`, run regex PII masking.
5. For `full`, store everything as-is.

---

### 2. Wire Audit Logging

**Goal:** record reviewer actions in the `AuditLog` table.

**Files to touch:**
- `apps/api/app/models.py` (`AuditLog` already exists)
- `apps/api/app/api/v1/runs.py` (`update_review_status`)
- `apps/api/app/api/v1/annotations.py`

**Concrete steps:**
1. Create a helper `log_audit(db, project_id, actor, action, resource_type, resource_id, note=None)`.
2. Call it in `PATCH /runs/{run_id}/review-status` after the DB commit.
3. Call it in `POST /api/v1/annotations` after creating an annotation.
4. Optionally expose `GET /api/v1/projects/{project_id}/audit-logs`.

---

### 3. Add Celery Service to Docker Compose

**Goal:** make the worker runnable in the dev stack.

**Files to touch:**
- `docker-compose.yml`

**Concrete steps:**
1. Add a `celery` service that uses the same `apps/api` context.
2. Command: `celery -A app.worker.celery_app worker --loglevel=info`.
3. Ensure `REDIS_URL` is set so Celery can connect to the `redis` service.

---

### 4. Refactor `worker.py`

**Goal:** clean up the Celery tasks.

**Files to touch:**
- `apps/api/app/worker.py`

**Concrete steps:**
1. Replace `next(_get_db())` with a context manager `with SessionLocal() as db:`.
2. Replace `TestClient` call in `replay_run_task` with a direct service function call.
3. Import `datetime` properly (already done; verify no F821 errors).

---

### 5. Full Replay Mode

**Goal:** implement `mode=full` that re-executes live tools for approved demo scenarios.

**Files to touch:**
- `apps/api/app/api/v1/replays.py`
- `apps/api/app/api/v1/tool_calls.py` or a new replay tool dispatcher

**Concrete steps:**
1. Add `mode=full` support to `/replays/{run_id}`.
2. Gate it behind an `ALLOW_FULL_REPLAY` env var.
3. For each `tool_call` span, re-run the tool with the saved arguments (for read-only demo tools only).
4. Update the new run with live tool outputs and new model responses.
5. Return the new run ID.

**Note:** this is lower priority than redaction/audit logging because it is explicitly marked as demo-only and has side-effect risk.

---

### 6. Additional Demo Workflows

**Goal:** add IT incident triage and compliance-review demo agents.

**Files to touch:**
- `apps/api/scripts/seed.py`
- Optionally `packages/sdk-py/examples/` or `packages/sdk-ts/examples/`

**Concrete steps:**
1. Add a second and third demo workflow in `seed.py`.
2. Seed runs for each workflow with their own failure modes.
3. Update the dashboard to showcase multiple workflows.

---

### 7. Backend Smoke Tests for New Endpoints

**Goal:** cover the new functionality added in previous sessions.

**Files to touch:**
- `apps/api/tests/test_smoke.py` or create `test_analytics.py`, `test_ingest.py`, `test_replays.py`, etc.

**Concrete steps:**
1. Test `/api/v1/analytics/cost-by-workflow`.
2. Test `/api/v1/runs/{id}/similar-failures`.
3. Test `/api/v1/ingest/otlp`.
4. Test `/api/v1/artifacts/upload` (mock S3/MinIO).
5. Test `/api/v1/replays/{id}` with `mode=partial`.
6. Test `/api/v1/runs/{id}/summarize` and `/api/v1/runs/{id}/suggest-failure-type`.

---

### 8. End-to-End Browser Demo

**Goal:** verify the full UI flow works.

**Steps:**
1. Seed the DB.
2. Start backend and frontend.
3. Open the dashboard and verify analytics charts.
4. Open a run, click **Analyze run**, and verify summary/root-cause cards appear.
5. Check **Similar Failures** sidebar.
6. Use **Partial replay** on a run and verify a new run is created.
7. Check for console errors.

## Suggested Priority Order for Next Session

1. Wire redaction into ingestion.
2. Wire audit logging.
3. Add Celery service to `docker-compose.yml`.
4. Refactor `worker.py`.
5. Add backend smoke tests.
6. Run end-to-end browser demo.
7. (Optional) Full replay mode.
8. (Optional) Additional demo workflows.
