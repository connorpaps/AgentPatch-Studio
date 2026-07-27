# AgentPatch Studio — Remaining Work (vs. spec)

This document lists the work still remaining to fully satisfy the product spec in `agentpatch_spec_kimi_v3.md`. Items are grouped by priority and written as concrete, step-by-step deliverables.

---

## Step 1 — OTLP / OpenTelemetry Ingestion

**Goal:** allow external agents to send traces using OTLP-style payloads, not just the custom SDK.

1. Add a new backend route `POST /api/v1/ingest/otlp`.
2. Accept a JSON payload shaped like an OTLP `ExportTraceServiceRequest` (or a simplified GenAI-style trace).
3. Map incoming spans to the internal `Run` / `Span` / `RetrievedDocument` / `Artifact` models.
4. Detect the workflow name and environment from span attributes.
5. Create a `Run` if one does not exist for the trace's root span.
6. Persist child spans with correct `parent_span_id` references.
7. Add a smoke test that sends a minimal OTLP-style payload and verifies the run appears in the database.
8. Document the endpoint in the SDK README and add a small Python/TypeScript example.

**Files likely touched:**
- `apps/api/app/api/v1/ingest.py` (new)
- `apps/api/app/main.py`
- `apps/api/app/schemas.py`
- `apps/api/tests/test_smoke.py` or `test_otlp.py`

---

## Step 2 — Root-Cause Analysis Layer

**Goal:** automatically suggest a likely failure type for a failed run using the spans and output.

1. Add a backend route `POST /api/v1/runs/{run_id}/suggest-failure-type`.
2. Gather run metadata, final output, and span data (tool names, retrieved docs, status).
3. Implement a heuristic first pass:
   - If a retrieval span has a stale/old source name → `stale_source`
   - If a tool span name does not match expected tools → `wrong_tool`
   - If output is unparseable JSON or malformed → `formatting`
   - If a span has status `error` and duration is high → `timeout`
   - If final output contains policy refusal wording → `policy_refusal`
   - If no retrieval docs were found and answer seems fabricated → `hallucination`
4. Optionally add an LLM-based second pass using the configured provider (`app/services/llm.py`).
5. Store the suggested failure type as an annotation or return it in the response without overwriting human labels.
6. Expose the suggestion in the run detail UI as a "Suggested root cause" card.
7. Add tests for each heuristic scenario.

**Files likely touched:**
- `apps/api/app/api/v1/runs.py`
- `apps/api/app/services/` (new analysis service)
- `apps/web/components/run-inspector.tsx`
- `apps/web/lib/api.ts`

---

## Step 3 — Trace Summarization & Patch Suggestions

**Goal:** produce one-sentence run summaries, failure explanations, and developer patch hints.

1. Add a backend route `POST /api/v1/runs/{run_id}/summarize`.
2. Build a prompt using:
   - User query
   - Final output
   - Failure type (if any)
   - Span names and statuses
3. Call the configured LLM provider (`app/services/llm.py`).
4. Return:
   - `summary`: one-sentence description of what the run did
   - `failure_explanation`: one-sentence explanation of why it failed
   - `patch_suggestion`: a concrete developer-facing hint (e.g. "Update retrieval filter to prefer 2024 policy documents")
5. Cache the result on the `Run` model or a new `RunAnalysis` table.
6. Display the summary cards on the run detail page.
7. Add tests with the `mock` LLM provider.

**Files likely touched:**
- `apps/api/app/api/v1/runs.py`
- `apps/api/app/models.py`
- `apps/api/app/services/llm.py`
- `apps/web/app/(app)/runs/[id]/page.tsx`
- `apps/web/components/run-inspector.tsx`

---

## Step 4 — Partial Replay Mode

**Goal:** rerun a historical run while reusing saved tool outputs or retrieved documents.

1. Extend the replay endpoint to accept a `mode` parameter: `metadata` or `partial`.
2. For `partial` mode:
   - Clone the run (as in metadata replay).
   - Replay model-call spans by invoking the configured LLM with the saved prompt/input.
   - Reuse the original tool outputs / retrieved docs instead of calling live tools.
   - Update durations, tokens, and cost on the new spans.
3. Persist the new run and link it to the original via `metadata_json["replayed_from"]`.
4. Add a UI selector on the run detail page to choose replay mode before triggering replay.
5. Add backend tests for partial replay.

**Files likely touched:**
- `apps/api/app/api/v1/replays.py`
- `apps/api/app/services/llm.py`
- `apps/web/app/(app)/runs/[id]/page.tsx`
- `apps/web/components/replay-button.tsx`
- `apps/web/lib/api.ts`

---

## Step 5 — Full Replay Mode (Approved Demo Scenarios Only)

**Goal:** rerun a historical run against live tools/APIs for approved demo scenarios.

1. Add `mode=full` support to the replay endpoint.
2. Identify which tool calls are safe to re-execute (e.g. read-only search calls, mock providers).
3. Re-execute those tool calls with the saved arguments.
4. Run new model calls with the new tool outputs.
5. Mark the new run with `mode: "full"` in metadata.
6. Gate this mode behind an `ALLOW_FULL_REPLAY` environment variable to prevent accidental external side effects.
7. Add tests using mocked tool endpoints.

**Files likely touched:**
- `apps/api/app/api/v1/replays.py`
- `apps/api/.env.example`
- `apps/web/components/replay-button.tsx`

---

## Step 6 — Background Worker / Queue

**Goal:** move heavy or async work (eval reruns, replay, summarization) out of the API request cycle.

1. Set up `apps/worker` as a Celery/Redis worker or add a lightweight async task runner.
2. Move `rerun_eval` execution to a background task.
3. Move `replay_run` execution to a background task.
4. Move run summarization to a background task.
5. Add a task status endpoint so the UI can poll for completion.
6. Update the eval and replay UI to show a loading/progress state.
7. Add docker-compose service for the worker.

**Files likely touched:**
- `apps/worker/` (new directory)
- `apps/api/app/api/v1/evals.py`
- `apps/api/app/api/v1/replays.py`
- `docker-compose.yml`
- `apps/web/lib/api.ts`

---

## Step 7 — Artifact Object Storage

**Goal:** actually store and serve artifact blobs, not just metadata.

1. Add a backend route `POST /api/v1/artifacts/upload` that accepts a multipart file.
2. Upload the file to the configured S3/MinIO bucket.
3. Generate a signed (or public) URL and store it as `storage_url`.
4. Update `record_artifact` to optionally accept a file stream or bytes.
5. Update the SDKs to support file uploads.
6. Add a docker-compose service for MinIO (already in `docker-compose.yml`).
7. Add tests using a mock S3 client or moto.

**Files likely touched:**
- `apps/api/app/api/v1/artifacts.py`
- `apps/api/app/services/storage.py` (new)
- `packages/sdk-ts/src/index.ts`
- `packages/sdk-py/agentpatch/client.py`
- `apps/web/components/artifacts.tsx`

---

## Step 8 — Content Capture / Redaction Modes

**Goal:** support metadata-only, redacted, and full-content capture levels.

1. Add a `capture_mode` setting per project: `metadata_only`, `redacted`, `full`.
2. On ingestion, apply the mode:
   - `metadata_only`: store timing, model names, status, but not raw prompts/outputs.
   - `redacted`: store content after simple PII pattern redaction.
   - `full`: store complete prompts and outputs.
3. Redact email, phone, SSN-like patterns before storing.
4. Return redacted content when fetching runs/spans if the mode is not `full`.
5. Add tests for each mode.
6. Expose the mode in the settings UI.

**Files likely touched:**
- `apps/api/app/models.py`
- `apps/api/app/schemas.py`
- `apps/api/app/api/v1/projects.py` (new or existing)
- `apps/api/app/services/redaction.py` (new)
- `apps/web/app/(app)/settings/page.tsx`

---

## Step 9 — Auth & RBAC

**Goal:** move beyond a single API key to user/project-level access control.

1. Add user model (email/password or OAuth via NextAuth/Clerk).
2. Add project membership/role model.
3. Protect frontend routes and backend endpoints.
4. Issue project-scoped API keys for ingestion.
5. Add audit log for reviewer actions.
6. Update settings page for user/project management.

**Files likely touched:**
- `apps/api/app/models.py`
- `apps/api/app/dependencies.py`
- `apps/web/app/(app)/settings/page.tsx`
- New auth modules in both apps

---

## Step 10 — Similar-Failure Clustering

**Goal:** group related failures using embeddings or sentence similarity.

1. Add an endpoint `GET /api/v1/runs/{run_id}/similar-failures`.
2. Compute or fetch embeddings for the run's user query and failure notes.
3. Compare against other failed runs in the same project.
4. Return the top-N similar runs with similarity scores.
5. Display a "Similar failures" card on the run detail page.
6. Add tests with mocked embeddings.

**Files likely touched:**
- `apps/api/app/api/v1/runs.py`
- `apps/api/app/services/embeddings.py` (new)
- `apps/web/components/run-inspector.tsx`

---

## Step 11 — Cost & Latency Analytics

**Goal:** provide analytics endpoints and UI for cost/latency insights.

1. Add `GET /api/v1/analytics/cost-by-workflow`.
2. Add `GET /api/v1/analytics/slowest-spans`.
3. Add `GET /api/v1/analytics/token-heavy-spans`.
4. Compute aggregates from `Run` and `Span` tables.
5. Add a dashboard page or tab showing these charts.

**Files likely touched:**
- `apps/api/app/api/v1/analytics.py` (new)
- `apps/api/app/main.py`
- `apps/web/app/(app)/page.tsx`
- `apps/web/lib/api.ts`

---

## Step 12 — Additional Demo Workflows

**Goal:** expand beyond the single support-policy agent.

1. Build an IT incident-triage demo agent.
2. Build a compliance-review demo agent.
3. Seed runs for each workflow.
4. Update the dashboard/workflow list to showcase multiple workflows.

**Files likely touched:**
- `apps/api/scripts/seed.py`
- New example agents in `packages/sdk-py/examples/` or `packages/sdk-ts/examples/`

---

## Quick priority order

1. OTLP / OpenTelemetry ingestion
2. Root-cause analysis layer
3. Trace summarization & patch suggestions
4. Partial replay mode
5. Background worker / queue
6. Artifact object storage
7. Content capture / redaction modes
8. Auth & RBAC
9. Similar-failure clustering
10. Cost & latency analytics
11. Full replay mode
12. Additional demo workflows

Use this list as the source of truth when deciding what to build next.
