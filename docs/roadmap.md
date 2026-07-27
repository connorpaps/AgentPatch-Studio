# AgentPatch Studio — MVP Implementation Roadmap

This document is the living plan for getting AgentPatch Studio from its current barebones state to a complete MVP. It was created from the current codebase audit and the product spec in `agentpatch_spec_kimi_v3.md`.

## Current state

**Backend (FastAPI + SQLAlchemy/SQLite)**
- Models: `Project`, `Environment`, `Workflow`, `Run`, `Span`, `Artifact`, `RetrievedDocument`, `Annotation`, `EvalCase`, `EvalResult`
- Routes: `health`, `runs`, `spans`, `tool_calls`, `retrievals`, `artifacts`, `workflows`, `annotations`, `compare`, `evals`
- Auth: simple `Authorization: Bearer <api-key>` check in `app/dependencies.py`
- LLM service: minimal provider abstraction in `app/services/llm.py` with `mock` and `openai` modes

**Frontend (Next.js + TypeScript + Tailwind)**
- Pages: dashboard, runs, run detail, compare, evals, review, settings
- Components: runs-table, span-timeline, run-inspector, runs-filter, kpi-card, charts, status-badge, create-eval-button, top-workflows, workflow-card
- API client: `apps/web/lib/api.ts`
- Types: `apps/web/lib/types.ts`

**Packages**
- `@agentpatch/shared-types`: shared TypeScript definitions
- `@agentpatch/sdk-ts`: lightweight SDK for emitting traces

## MVP definition of done

The MVP is complete when the app can:

1. Ingest and display a run with nested spans and tool calls.
2. Inspect inputs, outputs, retrieved documents, and artifacts.
3. Compare a failed run against a successful run.
4. Create an eval case from a failure.
5. Rerun that eval case against a patched workflow.
6. Present everything in a clean, professional UI.

---

## Phase 1 — Foundation & Demo Data ✅

*Goal: populate the app with realistic traces so the rest of the UI can be built and tested against real data.*

### Deliverables

- [x] Expand `@agentpatch/sdk-ts` to support the full trace lifecycle:
  - `startRun`, `endRun`, `startSpan`, `endSpan`, `recordToolCall`, `recordRetrieval`, `recordArtifact`, `recordAnnotation`
  - Typed input interfaces (`ArtifactInput`, `AnnotationInput`) and sensible defaults.
- [x] Create a demo support-policy agent that emits 13 runs covering:
  - Successful refund/triage answers.
  - `stale_source` failures (old policy retrieved).
  - `wrong_tool` failures (agent calls the wrong tool).
  - `wrong_tool_args` failures.
  - `hallucination` failures.
  - `formatting` failures.
  - `timeout`, `missing_escalation`, and `policy_refusal` edge cases.
- [x] Ensure seed script is idempotent and easy to run (`python scripts/seed.py`).
- [x] Backend supports an optional `started_at` on run start so demo runs can be spread across time.
- [x] Validate ingestion through API health checks and the dashboard.

### Files touched

- `packages/sdk-ts/src/index.ts`
- `apps/api/scripts/seed.py`
- `apps/api/app/schemas.py`
- `apps/api/app/api/v1/runs.py`

---

## Phase 2 — Core Trace UX ✅

*Goal: make the run detail page the visual centerpiece of the app.*

### Deliverables

- [x] Refactor `apps/web/app/(app)/runs/[id]/page.tsx` into a trace-explorer layout:
  - Left: scrollable span timeline.
  - Right: inspector panel for the selected span/run.
- [x] Enhance `apps/web/components/span-timeline.tsx` to:
  - Render nested spans with indentation.
  - Distinguish span types (model_call, tool_call, retrieval, guardrail, etc.).
  - Show latency bar, token counts, and status badge per span.
  - Provide a run-level overview row.
- [x] Enhance `apps/web/components/run-inspector.tsx` to show:
  - Run metadata, final input/output, retrieved documents, artifacts.
  - Annotation/root-cause tagging form with optimistic UI updates.
- [x] Add LLM-generated run summary and failure explanation cards.
- [x] Add empty states and loading skeletons.

### Files touched

- `apps/web/app/(app)/runs/[id]/page.tsx`
- `apps/web/components/span-timeline.tsx`
- `apps/web/components/span-row.tsx`
- `apps/web/components/run-inspector.tsx`
- `apps/web/lib/api.ts`

---

## Phase 3 — Compare & Eval Loops ✅

*Goal: make compare useful and evals trackable.*

### Deliverables

- [x] Improve `apps/web/app/(app)/compare/page.tsx`:
  - Side-by-side output diff.
  - Diff highlighting for prompt payloads, tool arguments, and retrieved docs.
  - Divergence summary card.
- [x] Add eval result history:
  - New endpoint `GET /api/v1/evals/{eval_case_id}/results`.
  - Update eval lab table to show score, pass/fail, and judge reason.
- [x] Upgrade `POST /api/v1/evals/{eval_case_id}/rerun` to accept patch parameters:
  - `prompt_version`
  - `model_name`
  - `temperature`
  - `workflow_version`
- [x] Display score trends across eval reruns.

### Implementation notes

1. **Compare page**: fetch two runs by ID and compute a divergence summary. Use simple string/JSON diff utilities rather than a heavy inline code diff library for MVP. Highlight changes in:
   - `output_payload` (final answer)
   - `input_payload` (user query / prompt)
   - Tool call names and arguments
   - Retrieved document references

2. **Eval result history**: add a new backend route returning all `EvalResult` rows for a case, ordered by `created_at DESC`. Update the evals table to show a history sub-table or an expandable row for each case.

3. **Rerun with patch params**: extend `EvalRerunRequest` (or create one) so the rerun endpoint can simulate a different workflow/prompt. Persist these patch params on the new `EvalResult` row and re-run the LLM judge.

4. **Score trends**: for each eval case, show a small sparkline or a list of the last N scores so users can see whether patches improved the case.

### Files touched

- `apps/api/app/api/v1/evals.py`
- `apps/api/app/schemas.py`
- `apps/api/app/models.py` (add patch params to EvalResult if not already present)
- `apps/web/app/(app)/compare/page.tsx`
- `apps/web/app/(app)/evals/page.tsx`
- `apps/web/lib/api.ts`
- `apps/web/lib/types.ts` (if new DTOs are needed)

---

## Phase 4 — Replay, Settings, and Dashboard Polish ✅

*Goal: add replay mechanics, finish the settings page, and make the dashboard feel alive.*

### Deliverables

- [x] Create `apps/api/app/api/v1/replays.py` with metadata/partial replay:
  - Accept a `run_id`.
  - Duplicate the run as a simulation.
  - Reuse saved span timings and outputs.
- [x] Add a “Replay run” button on the run detail page.
- [x] Expand `apps/web/app/(app)/settings/page.tsx` with:
  - Project/environment stubs.
  - API key display (stubbed).
  - UI theme preference.
- [x] Update the dashboard with real KPIs:
  - Total runs, success/failure counts, review queue size, average latency, estimated cost.
  - Failure trend chart populated from real data.
  - Top workflows list populated from real data.
- [x] Add empty states when no runs exist.

### Implementation notes

1. **Replay endpoint**: create a new `Run` row with `external_run_id` prefixed by `sim_` (or a new `is_replay` flag if added to the model). Copy all spans and artifacts into new rows linked to the new run. Return the new `run_id`.

2. **Replay UI**: add a button on the run detail page that calls the replay endpoint and redirects to the new run. Use a loading state and show a confirmation toast.

3. **Settings page**: keep this lightweight for MVP. Show read-only project info, a masked API key, and a theme toggle that sets a class on `<html>`. Do not implement full user management.

4. **Dashboard polish**: wire the existing KPI cards and charts to real API data. Add empty states that prompt the user to run `python scripts/seed.py` if no runs exist.

### Files touched

- `apps/api/app/api/v1/replays.py` (new)
- `apps/api/app/main.py` (register replay router)
- `apps/web/app/(app)/runs/[id]/page.tsx`
- `apps/web/app/(app)/settings/page.tsx`
- `apps/web/app/(app)/page.tsx`
- `apps/web/components/failure-trend-chart.tsx`
- `apps/web/components/top-workflows.tsx`
- `apps/web/lib/api.ts`

---

## Phase 5 — Validation & Polish ✅

*Goal: ensure the app is stable, type-safe, and demo-ready.*

### Deliverables

- [x] Run `npm run typecheck` across all workspaces.
- [x] Run backend tests (`pytest apps/api/tests`).
- [x] Run `npm run lint` and fix issues.
- [x] Do an end-to-end demo run-through:
  - Start the demo agent / seed the database.
  - View runs on the dashboard.
  - Open a run and inspect spans.
  - Compare a failed run against a successful one.
  - Create an eval case and rerun it.
  - Replay a run.
- [ ] Capture portfolio screenshots/video of the key screens (optional).

---

## Quick reference: priority order

1. Phase 1: Foundation & Demo Data ✅
2. Phase 2: Core Trace UX ✅
3. Phase 3: Compare & Eval Loops
4. Phase 4: Replay, Settings, Dashboard Polish
5. Phase 5: Validation & Polish

Start with Phase 3 when you're ready. Phase 1 and Phase 2 are complete and the app now has realistic demo data plus a working trace-explorer UI.
