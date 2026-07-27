# AgentPatch — final_steps.md

> Goal of this document: take AgentPatch from "MVP-complete, locally-running"
> to "publicly-deployable, portfolio-ready, production-hygiene-clean."
>
> **Total effort envelope**: ~3-4 hours focused for Tier 1 + 2, + ~1 hour
> for Tier 3, optional + ~2-3 hours for Tier 4. The reader of this file is
> a fresh AI session executing the plan in a single sitting. They have
> this document and the codebase — nothing else.

---

## 0. Status snapshot

### Already shipped (DO NOT redo)

The following was completed in the prior session and verified end-to-end.
Treat these as invariants going forward.

- **Postgres-flip**: `apps/api/.env` now uses Postgres at host `:5433`
  (container `:5432`). `docker-compose.yml` maps host `:5433 → :5432` for
  Postgres and host `:6380 → :6379` for Redis. MinIO unchanged at
  `:9000` (api) and `:9001` (console).
- **One-command bootstrap**: `scripts/start-dev.sh` brings up Postgres
  + Redis + MinIO via `docker compose`, waits for Postgres with
  `pg_isready` via `docker compose exec`, runs `apps/api/scripts/seed.py`,
  optionally starts `uvicorn` (writes `api.pid`) and `next dev` (writes
  `web.pid`), then runs a 3-step readiness probe (POST `/auth/demo`,
  GET `/auth/me`, GET `/runs?limit=1` — `--max-time 10` on the GETs,
  `--max-time 5` on the POST) and prints a 3-bullet walkthrough.
  `trap` cleans up the cookie file. Logs go to `$ROOT/logs/` (with `/tmp`
  fallback).
- **Auth fix**: `apps/web/lib/api.ts` now sends
  `credentials: "include"` on the cross-origin fetch so the demo
  `agentpatch.session` / `agentpatch.demo` JWT cookie survives
  navigation. Without this, the middleware bounced every protected
  route to `/login`. This is the linchpin — leave it alone.
- **Compare deep-link**: `apps/web/app/(app)/compare/page.tsx` reads
  `?a=&b=` from `window.location.search` inside the existing
  useEffect, validates both IDs against the loaded runs, and
  auto-triggers `compareRuns(a, b)` so a deep-linked diff renders
  on first paint. The 2-line dead-code guard
  (`if (typeof window === "undefined") return;`) was removed.
- **5 portfolio screenshots** at `apps/web/public/screenshots/`:
  - `01-dashboard.png` 155 KB
  - `02-runs.png` 231 KB
  - `03-run-detail.png` 105 KB
  - `04-compare.png` 148 KB (post deep-link fix; was 46 KB)
  - `05-evals.png` 54 KB

### Currently live on this machine

| Service        | Where           | Healthcheck            |
| -------------- | --------------- | ---------------------- |
| Postgres       | localhost:5433  | `pg_isready -U postgres -d agentpatch` |
| Redis          | localhost:6380  | ignored (Celery eager) |
| MinIO          | localhost:9000  | `/minio/health/live`   |
| FastAPI uvicorn| localhost:8000  | `GET /api/v1/health`   |
| Next.js dev    | localhost:3000  | `GET /`                |

### Tech-stack reference (for path/import correctness)

- **API** (`apps/api`): Python 3.11, FastAPI 0.110+, SQLAlchemy 2
  (`Mapped[...]` style), Pydantic v2 (`model_config = ConfigDict(...)`),
  Alembic, Celery (eager mode in dev). Dependency entrypoint is
  `app.dependencies.get_principal` (cookie first, Bearer fallback).
- **Web** (`apps/web`): Next.js 15 App Router, React 18, `"use client"`
  on interactive components, Tailwind 3, lucide-react icons. Auth
  helpers in `lib/api.ts`; shared types in `lib/types.ts`; utility
  cn() in `lib/utils.ts`.
- **DB / cache / object store**: Postgres 16, Redis 7, MinIO (S3-
  compatible).
- **SDKs**: `packages/sdk-ts` (TypeScript ingest client) and
  `packages/sdk-py` (Python ingest client). Each has its own README
  with copy-paste install snippets — read those before quoting in
  Tier 2.2.

---

## 1. Tier 1 — Portfolio + resume must-have (~1-2 hours)

These two items are the difference between "interesting GitHub repo"
and a portfolio line on a resume. Both are non-negotiable.

### 1.1 Top-level README.md  ·  ~30 min  ·  ★★★★★ resume impact

**Goal**: a recruiter reads this file in 5 minutes and (a) understands
what AgentPatch is, (b) sees a hero screenshot, (c) knows how to run
it locally, (d) finds the live demo URL.

**Status today**: missing entirely. Create at
`G:/AgentPatch/README.md` (project root).

**Required sections** in this exact order:

1. **Title + tagline + (optional) badges**
   ```
   # AgentPatch Studio
   Trace every agent execution. Reproduce failures. Ship fixes with confidence.
   ```
   Skip GitHub badges for now (no CI yet). If a `LICENSE` file is added
   in Tier 3+, include a license badge.

2. **Hero screenshot** (the single highest-impact image on the README)
   ```markdown
   ![AgentPatch Studio dashboard](./apps/web/public/screenshots/01-dashboard.png)
   ```
   One sentence under it: "Five pre-seeded workflows, 26 runs, 14
   realistic failures — exploreable in one click via `/demo`."

3. **Positioning paragraph** (≤ 80 words)
   - **What**: an agent-execution tracing, replay-from-trace, side-by-
     side diffing, and eval-from-failure platform for production
     LLM-agent systems.
   - **Who**: teams shipping multi-step agents who need first-class
     observability + reproduction tools (vs LangSmith/Helicone/Datadog
     LLM Observability which give traces but no diff, no replay-from-
     trace, no eval-from-failure).
   - **Why now**: as agents handle real traffic, on-call teams need
     `git blame`-style tooling for the agent layer.

4. **5-minute quickstart** (must work on a clean Windows / macOS /
   Linux machine)
   ```bash
   git clone https://github.com/<owner>/AgentPatch
   cd AgentPatch
   bash scripts/start-dev.sh
   ```
   Explain what the script does: brings up Postgres + Redis + MinIO
   in Docker, runs the seed (3 workflow archetypes × ~26 runs), starts
   the API and web dev servers, prints 3 walkthrough URLs.

5. **Live demo URL** (placeholder until 1.2 lands)
   - Before deploy: `[Coming soon — see §1.2]`.
   - After deploy: `[Live demo →](https://<vercel-domain>)` plus a
     badge.

6. **Architecture diagram** (use a Mermaid block — renders natively
   on GitHub)
   ```mermaid
   graph LR
     Browser[Next.js Studio<br/>:3000] -->|cookies + Bearer| API[FastAPI<br/>:8000]
     API --> PG[(Postgres<br/>:5433)]
     API --> Redis[(Redis<br/>:6380)]
     API --> S3[(MinIO<br/>:9000)]
     SDK_ts[TypeScript SDK<br/>packages/sdk-ts] -->|OTLP| API
     SDK_py[Python SDK<br/>packages/sdk-py] -->|OTLP| API
   ```

7. **Feature highlights** (3-5 bullets max — link to other screenshots)
   - **Trace every span** — `![runs](./apps/web/public/screenshots/02-runs.png)`
   - **Replay any run** — text only, no image
   - **Side-by-side diff** — `![compare](./apps/web/public/screenshots/04-compare.png)`
   - **Eval-from-failure regression suite** — `![evals](./apps/web/public/screenshots/05-evals.png)`
   - **Heuristic + LLM-suggested failure types** — text only

8. **Tech stack** (one line per category)
   - API: FastAPI + SQLAlchemy 2 + Pydantic v2 + Alembic
   - Web: Next.js 15 + React 18 + Tailwind + lucide-react
   - DB / cache / object store: Postgres 16 / Redis 7 / MinIO
   - SDKs: TypeScript (`packages/sdk-ts`) + Python (`packages/sdk-py`)

9. **Run the tests**
   ```bash
   cd apps/api
   pytest -q    # 33 passed, 0 deprecation warnings (after Tier 2.1)
   ```

10. **Project layout**
    ```
    apps/api         FastAPI service (Python 3.11)
    apps/web         Next.js studio
    packages/sdk-ts  TypeScript ingest SDK
    packages/sdk-py  Python ingest SDK
    scripts          start-dev.sh + future ops scripts
    docker-compose.yml  Postgres + Redis + MinIO stack
    apps/web/public/screenshots/  README hero images
    final_steps.md   This file (planning only; safe to delete before push)
    ```

11. **License** — MIT or note LICENSE exists.

12. **Footer** — "Built in ~X hours. See [`final_steps.md`](./final_steps.md)
    for the remaining roadmap (production hardening pending)."

**Verification**:
- `head -50 README.md` shows the title + hero.
- `wc -l README.md` ≥ 80 lines.
- Every `![...](./apps/web/public/screenshots/*.png)` link resolves to
  a real file.

### 1.2 Public deploy  ·  ~60 min  ·  ★★★★★ resume impact

**Goal**: a live URL works end-to-end so the README's "Live demo" link
points to a real thing.

**Pick one of two equivalent stacks** (preference order: A, then B):

#### Option A — Vercel (web) + Render (api, postgres, redis)

**Web on Vercel**:
1. Import the repo. Set **Root Directory** to `apps/web`.
2. **Build command**: `npm run build` (Next.js).
3. **Output directory**: `.next` (auto-detected).
4. **Environment variables**:
   - `NEXT_PUBLIC_API_BASE_URL` = `https://<api-hostname>`
   - `NEXT_PUBLIC_API_KEY` = leave empty — the live demo uses cookie
     auth only. Bearer auth is for ingested SDK traffic.
5. **Pre-deploy sanity**: `cd apps/web && npm run build` locally and
   confirm it succeeds.
6. Optional: add a custom domain.

**API on Render (Web Service)**:
1. New Web Service from the repo. **Root Directory**: `apps/api`.
2. **Build command**: `pip install -r requirements.txt`.
3. **Start command**:
   `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
4. **Environment variables**:
   - `DATABASE_URL` = render-managed Postgres URL
   - `REDIS_URL` = render-managed Redis URL
   - `AGENTPATCH_JWT_SECRET` = a 64-char random hex string
   - `AGENTPATCH_ENV=production`
   - `AGENTPATCH_SECURE_COOKIES=true`
   - `ALLOWED_ORIGINS` = `https://<vercel-domain>`
5. **Health check path**: `/api/v1/health`.

**Database (Render Postgres free tier or Neon free tier)**:
1. Provision. Capture the external connection URL.
2. Run alembic against it once:
   ```bash
   DATABASE_URL=<prod url> alembic upgrade head
   apps/api/scripts/seed.py  # optional — seeds the demo workspace
   ```
   If seeding in prod, document clearly that the `/demo` flow is
   creating real rows and the `/auth/demo` endpoint is gated by
   `AGENTPATCH_ENV=production` (Tier 4.1).

**Redis (Render or Upstash free tier)**:
1. Provision. Capture URL.

**MinIO → S3 swap (mandatory for prod)**:
- Provision S3 (or Cloudflare R2 free tier) with a single bucket
  named e.g. `agentpatch-artifacts`.
- In `apps/api/app/services/storage.py`, the env-driven switch is
  already in place. Set:
  - `S3_ENDPOINT` = bucket endpoint
  - `S3_BUCKET` = `agentpatch-artifacts`
  - `S3_ACCESS_KEY`, `S3_SECRET_KEY`
- Verify by curling `/api/v1/health` and exercising `/api/v1/artifacts`.

**Post-deploy smoke test**:
```bash
curl https://<api-hostname>/api/v1/health     # → 200
# Visit https://<web-domain>/demo and walk through all 5 routes
# (Dashboard, Runs, Run-detail, Compare, Evals)
# Re-capture the 5 screenshots at apps/web/public/screenshots/
```
Re-capture with the same Chrome `--headless=new` recipe used in the
prior session (see "Capturing screenshots" appendix at the bottom of
this file).

#### Option B — Vercel (web) + Railway (api, postgres, redis)

Same as Option A but substitute Railway's one-click Postgres / Redis /
Web Service. Process types: `web` (api) and `worker` (celery, optional).

**Acceptance**: every route on the deployed web domain returns 200 for
an unauthenticated visitor to `/` (renders the marketing-style landing),
then after one click to `/demo` the demo cookie is set and all 5
portfolio pages render with seeded data.

---

## 2. Tier 2 — Credibility signals (~1 hour)

These items close spec gaps the prior plan locked in. They are what
gets a candidate through the technical screen.

### 2.1 B1 — silence the 9 pytest deprecation warnings  ·  ~30 min

**Status today**: `pytest -q` produces 33 passed + 9 deprecation
warnings. Recategorize and fix root causes.

**Files to change**:
- `apps/api/app/schemas.py` — 6 Pydantic v2 migration warnings.
- `apps/api/app/main.py` — 2 FastAPI `on_event` deprecation warnings.
- `apps/api/tests/test_auth.py` — 1 httpx `cookies=` kwarg deprecation.

#### 2.1.a Pydantic ConfigDict on 6 read schemas

In `apps/api/app/schemas.py`, find and update each of:
- `RunSummary`
- `SpanSummary`
- `RunDetail`
- `AnnotationSummary`
- `EvalResultSummary`
- `RetrievedDocumentSummary`

For each, replace:
```python
class RunSummary(BaseModel):
    ...
    class Config:
        from_attributes = True
```
with:
```python
class RunSummary(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        protected_namespaces=(),   # avoids warning on `model_*` fields
    )
    ...
```

Add `from pydantic import ConfigDict` at the top of `schemas.py`
(otherwise, the existing auth schemas already import ConfigDict — fine
to reuse the import). Verify the 6 schemas now follow the same pattern
that `apps/api/app/api/v1/auth.py` already uses (which has been
migrated correctly and is your reference style).

#### 2.1.b FastAPI lifespan

In `apps/api/app/main.py`, locate:
```python
@app.on_event("startup")
async def on_startup():
    # startup logic
@app.on_event("shutdown")
async def on_shutdown():
    # shutdown logic
```

Replace with:
```python
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # (whatever startup logic was here)
    yield
    # (whatever shutdown logic was here)

app = FastAPI(
    title="AgentPatch API",
    lifespan=lifespan,
    # ... other constructor args preserved
)
```

**Important**: any module-level side-effects on import (e.g. attaching
exception handlers, mounting routers) should stay at module level —
only the `on_event`-decorated function bodies move into the lifespan
context manager.

#### 2.1.c httpx cookies test cleanup

In `apps/api/tests/test_auth.py`, find TestClient or `httpx.get/post`
calls that pass a `cookies={...}` kwarg. Pin cookies at client
construction instead:
```python
# Before
client.post("/api/v1/...", cookies={"agentpatch.session": token})

# After
client = TestClient(app, cookies={"agentpatch.session": token})
client.post("/api/v1/...")
```
Or, for one-off cookies: `client.post(..., headers={"Cookie": f"agentpatch.session={token}"})`.

**Verification**: from `apps/api`, run `pytest -q`. Expect
`33 passed, 0 warnings`. If any warning persists, fix the offending
file and re-run.

### 2.2 C1 — Settings / Integrations depth  ·  ~30 min  ·  ★★★

**Goal**: the current Settings page (`apps/web/app/(app)/settings/page.tsx`)
is thin. Add three cards that close visible spec gaps.

#### 2.2.a Add 3 cards to the Settings page

The page already has the project name + capture-mode editor. Add three
new sections below those, stacked vertically with consistent
rounded-2xl border styling matching the existing cards.

**Card 1 — Install the SDK** (a tabbed code block)

Layout: two tabs (`TypeScript` / `Python`) with a copy button per panel.

TypeScript panel reads from `packages/sdk-ts/README.md` (avoid
guessing — copy the actual install + first-call code). Snippet shape:
```ts
import { AgentPatchClient } from "@agentpatch/sdk";
const ap = new AgentPatchClient({
  apiKey: process.env.AGENTPATCH_API_KEY,
  projectId: "<your-project-id>",
});
await ap.traces.ingest({ ... });
```

Python panel from `packages/sdk-py/README.md`:
```python
from agentpatch import AgentPatchClient
ap = AgentPatchClient(api_key=os.environ["AGENTPATCH_API_KEY"])
ap.traces.ingest({ ... })
```

**Copy button** (one per panel):
```tsx
<button
  type="button"
  onClick={() => navigator.clipboard.writeText(CODE)}
  className="absolute right-2 top-2 ..."
  aria-label="Copy install snippet"
>
  <ClipboardIcon /> {copied ? "Copied" : "Copy"}
</button>
```
Use a tiny `useState<boolean>` for "copied" feedback.

**Card 2 — OTLP ingest curl example**

A `<pre>` block with copy button, showing a paste-ready curl:
```bash
curl -X POST $AGENTPATCH_API_BASE_URL/api/v1/ingest/otlp \
  -H "Authorization: Bearer $AGENTPATCH_API_KEY" \
  -H "Content-Type: application/json" \
  -d @otlp-payload.json
```

Below it, a collapsible `<details>` with a 1-span sample payload:
```json
{
  "resource_spans": [{
    "resource": { "attributes": [{ "key": "service.name", "value": { "string_value": "demo-agent" } }] },
    "scope_spans": [{
      "spans": [{
        "trace_id": "5b8efff798038103d269b633813fc60c",
        "span_id": "eee19b7ec3c1b174",
        "name": "llm.call",
        "start_time_unix_nano": "1700000000000000000",
        "end_time_unix_nano":   "1700000001500000000",
        "attributes": [
          { "key": "model", "value": { "string_value": "gpt-4o-mini" } },
          { "key": "tokens", "value": { "int_value": "350" } }
        ]
      }]
    }]
  }]
}
```

**Card 3 — Retention slider**

Four options: 7 days / 30 days / 90 days / Indefinite (∞).

Implementation: a 4-option segmented control saves on change:
```tsx
const RETENTION_OPTIONS = [
  { label: "7d",  value: 7 },
  { label: "30d", value: 30 },
  { label: "90d", value: 90 },
  { label: "∞",   value: null },   // null = indefinite
];

// On change:
await updateCurrentProject({ retention_days: value });
```

Show an estimated storage cost hint per option (small `<p>` below
the segmented control): "30 days ≈ X MB at current volume".

#### 2.2.b Backend changes for retention

**File**: `apps/api/app/models.py` — add a column to `Project`:
```python
retention_days: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
```

**Alembic migration** — create a new file under
`apps/api/alembic/versions/` (named `<auto>_<short>.py` per Alembic's
convention; or use `alembic revision -m "add retention_days"` and edit
the generated file). Body:
```python
def upgrade():
    op.add_column("projects", sa.Column("retention_days", sa.Integer(), nullable=True))
def downgrade():
    op.drop_column("projects", "retention_days")
```

**ProjectUpdate schema** in `apps/api/app/api/v1/projects.py`:
```python
class ProjectUpdate(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    name: Optional[str] = None
    capture_mode: Optional[CaptureMode] = None
    retention_days: Optional[int] = Field(default=None, ge=1, le=3650)
```

Apply it in the `PUT /api/v1/projects/me` handler.

**Optional**: a Celery beat job to prune Runs where
`started_at < now() - retention_days`. Implement in Tier 4.5.

**Acceptance**:
- Visit `/settings`. Three new cards visible.
- Toggle retention to "30d", reload the page. Value persists.
- Copy button on the SDK snippet actually copies to clipboard
  (visible "Copied" feedback).

### 2.3 C2 — Batch eval rerun  ·  ~30 min  ·  ★★★

**Goal**: "Rerun all failing eval cases" as a single button. Currently
only per-case rerun exists.

#### 2.3.a Backend endpoint

In `apps/api/app/api/v1/evals.py`:

```python
class BatchRerunRequest(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    case_ids: Optional[list[str]] = None
    all_failing: bool = True
    options: EvalRerunOptions = Field(default_factory=EvalRerunOptions)

class BatchRerunResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    job_id: str
    total_cases: int
    succeeded: int
    failed: int

@router.post("/evals/batch-rerun", response_model=BatchRerunResponse)
def batch_rerun(
    payload: BatchRerunRequest,
    db: Session = Depends(get_db),
):
    if payload.case_ids:
        cases = db.query(EvalCase).filter(EvalCase.id.in_(payload.case_ids)).all()
    elif payload.all_failing:
        # Cases whose latest eval_result has passed=False (or no rows yet)
        cases = get_failing_eval_cases(db)
    else:
        cases = []
    job = create_batch_rerun_job(db, cases, payload.options)
    succeeded = sum(1 for c in job.case_outcomes if c.passed)
    return BatchRerunResponse(
        job_id=job.id,
        total_cases=len(cases),
        succeeded=succeeded,
        failed=len(cases) - succeeded,
    )
```

`create_batch_rerun_job` is a helper that (a) creates a `BatchRerunJob`
DB row, (b) iterates the cases calling the existing single-case rerun
function, (c) records per-case outcomes, (d) returns the job row.

Eager-mode Celery is fine — no need to wire a queue. The handler runs
synchronously and returns when all cases are done.

#### 2.3.b Frontend button on the Eval Lab page

In `apps/web/app/(app)/evals/page.tsx`, above the existing "Create
eval from run" card, add:

```tsx
<div className="rounded-lg border border-border bg-surface p-5 space-y-3">
  <div className="flex items-center justify-between">
    <div>
      <h2 className="text-sm font-semibold">Batch rerun</h2>
      <p className="text-xs text-muted">
        Re-execute every failing eval case with the same config.
      </p>
    </div>
    <Button onClick={handleBatchRerun} disabled={batchLoading}>
      <RefreshCwIcon className="h-4 w-4" />
      {batchLoading ? "Rerunning..." : "Rerun all failing"}
    </Button>
  </div>
  {batchMessage && <p className="text-xs text-muted">{batchMessage}</p>}
</div>
```

`handleBatchRerun`:
```tsx
async function handleBatchRerun() {
  setBatchLoading(true);
  const res = await api<BatchRerunResponse>("/api/v1/evals/batch-rerun", {
    method: "POST", body: JSON.stringify({}),
  });
  setBatchMessage(`Rerun complete: ${res.succeeded}/${res.total_cases} passed.`);
  await refreshData();
  setBatchLoading(false);
}
```

Refresh the evals table after the rerun so new scores appear.

Add the `BatchRerunResponse` type to `apps/web/lib/types.ts`.

#### 2.3.c Tests

Add a test in `apps/api/tests/test_evals.py` (or wherever evals live)
that:
1. Seeds 3 eval cases — 2 with `passed=False`, 1 with `passed=True`.
2. POSTs `/api/v1/evals/batch-rerun` with `{}`.
3. Asserts response shape: `{job_id, total_cases: 3, succeeded, failed}`.

**Acceptance**:
- `pytest -k batch` passes.
- `/evals` page shows the "Rerun all failing" button.
- Clicking it updates the table within 5 seconds.

---

## 3. Tier 3 — Portfolio polish (~1 hour)

The "this app was made by someone who cares" pass. Skip any item that
the executor doesn't have time for, but do at least 3.1 (mobile) and
3.3 (404) — they're the most visible.

### 3.1 Mobile responsiveness audit  ·  ~20 min  ·  ★★

Open `http://localhost:3000/demo` in Chrome DevTools. Set the viewport
to 375×812 (iPhone X / equivalent Android).

For each page, audit:

- **Dashboard** (`/`) — KPI grid `grid-cols-5` collapses via the
  existing `sm:grid-cols-2 lg:grid-cols-5` breakpoints — verify it
  stacks cleanly at 375px.
- **Runs** (`/runs`) — the runs table becomes horizontally scrollable.
  Add `overflow-x-auto` if missing.
- **Run detail** (`/runs/[id]`) — `lg:grid-cols-4` should collapse
  to single column below `lg`.
- **Compare** (`/compare`) — `md:grid-cols-2` should collapse.
- **Eval Lab** (`/evals`) — table scrolls; the 4-column rerun input
  row collapses via responsive grid.
- **Settings** (`/settings`) — stack to single column.
- **Review** (`/review`) — single column.

Verify: at 375px viewport, **the page body never produces a
horizontal scrollbar**. Components may scroll internally; the page
itself should not.

### 3.2 Accessibility  ·  ~20 min  ·  ★★

- Every `<button>` whose only child is an icon gets
  `aria-label="..."`. Common offenders: `ThemeToggle` button, the
  `UserMenu` trigger, the Copy buttons from Tier 2.2, the Replay /
  Create-eval buttons on the run detail header if they collapse to
  icons on mobile.
- Add `focus-visible:ring-2 focus-visible:ring-accent/50` to every
  theme-able `<button>` (already on `<Button>` via `tailwind-merge`).
  Spot-check that focus is visible when tabbing through the page.
- Color contrast on:
  - `bg-green-100 text-green-700` → confirm passes WCAG AA (4.5:1).
  - `bg-red-100 text-red-700` → confirm passes WCAG AA.
  - If either fails, darken the text by one Tailwind shade.
- Skip-link at the top of `apps/web/app/(app)/layout.tsx`:
  ```tsx
  <a
    href="#main-content"
    className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-accent focus:px-3 focus:py-1.5 focus:text-white"
  >
    Skip to main content
  </a>
  ```
  Plus `<main id="main-content">` on the layout.

### 3.3 Custom 404 + error pages  ·  ~10 min  ·  ★★

Create `apps/web/app/not-found.tsx`:

```tsx
import Link from "next/link";
import { Sparkles, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="max-w-md rounded-2xl border border-border bg-surface p-8 text-center">
        <p className="text-5xl font-bold tracking-tight">404</p>
        <h1 className="mt-4 text-xl font-semibold">Page not found</h1>
        <p className="mt-2 text-sm text-muted">
          The page you were looking for doesn't exist or has moved.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link href="/" className="..."><ArrowLeft /> Back to dashboard</Link>
          <Link href="/demo" className="..."><Sparkles /> Open the demo</Link>
        </div>
      </div>
    </div>
  );
}
```

Optional: also add `apps/web/app/global-error.tsx` for boundary errors.

### 3.4 Open Graph meta  ·  ~5 min  ·  ★

In `apps/web/app/layout.tsx`:

```tsx
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_PUBLIC_URL ?? "http://localhost:3000"),
  title: "AgentPatch Studio",
  description: "Trace every agent execution. Reproduce failures. Ship fixes with confidence.",
  openGraph: {
    title: "AgentPatch Studio",
    description: "Trace every agent execution. Reproduce failures. Ship fixes with confidence.",
    images: [{ url: "/screenshots/01-dashboard.png", width: 1440, height: 900 }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/screenshots/01-dashboard.png"],
  },
};
```

Verify the deploy (or local ngrok) URL unfurls correctly in Slack or
LinkedIn.

### 3.5 Empty states audited  ·  ~15 min  ·  ★

For every page that lists entities:

- `apps/web/app/(app)/runs/page.tsx`:
  ```tsx
  {runs.length === 0 && (
    <EmptyState
      icon={<Inbox className="h-10 w-10 text-muted" />}
      title="No runs match these filters"
      cta={<Button variant="outline" onClick={() => setFilters({})}>Clear filters</Button>}
    />
  )}
  ```
- `apps/web/app/(app)/evals/page.tsx`: Already has a basic empty state
  ("No eval cases yet"). Tighten microcopy.
- `apps/web/components/top-workflows.tsx`: Friendly empty list.
- Anywhere else that renders `[]`.

Optional helper: `apps/web/components/ui/empty-state.tsx`:
```tsx
export function EmptyState({ icon, title, description, cta }: { ... }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-surface/50 px-6 py-12 text-center">
      <div className="mx-auto w-fit">{icon}</div>
      <h3 className="mt-4 text-base font-semibold">{title}</h3>
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      {cta && <div className="mt-4 inline-flex">{cta}</div>}
    </div>
  );
}
```

---

## 4. Tier 4 — Production hygiene (skip for portfolio)

"Engineer who can ship" signals. None of these are required for a
portfolio URL. Implement only if you're going to onboard real users.

### 4.1 Disable `/auth/demo` + `/auth/magic-link/sample` in production  ·  ~5 min

The endpoints already gate on `os.getenv("AGENTPATCH_ENV", "development")`.
Verify with a curl run against an env-staged API:

```bash
AGENTPATCH_ENV=production uvicorn app.main:app
curl -X POST http://localhost:8000/api/v1/auth/demo            # → 404
curl http://localhost:8000/api/v1/auth/magic-link/sample       # → 404
```

If `--max-time 5` curl tests pass with empty 404 bodies, the gate
already works. Otherwise tighten the check in
`apps/api/app/api/v1/auth.py`.

### 4.2 Rate limit `/auth/*` and `/ingest/otlp`  ·  ~20 min

Add [slowapi](https://github.com/laurentS/slowapi):
```python
# requirements.txt
slowapi==0.1.9

# apps/api/app/main.py
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=lambda: get_remote_address())

# After app = FastAPI(...)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Per route
@router.post("/auth/magic-link/request")
@limiter.limit("5/minute")
def ...: ...

@router.post("/auth/demo")
@limiter.limit("60/minute")
def ...: ...

@router.post("/ingest/otlp")
@limiter.limit("1000/minute")
def ...: ...
```

### 4.3 CORS tightening  ·  ~5 min

- Source `ALLOWED_ORIGINS` from env (comma-separated).
- On the deployed env, set `ALLOWED_ORIGINS=https://<vercel-domain>`.
- Local dev: `ALLOWED_ORIGINS=http://localhost:3000`.

### 4.4 Prometheus `/metrics`  ·  ~30 min

Add `prometheus-fastapi-instrumentator`:
```python
from prometheus_fastapi_instrumentator import Instrumentator
Instrumentator().instrument(app).expose(app, endpoint="/metrics")
```

Verify `curl https://<api>/metrics` returns Prometheus text format.

### 4.5 `MagicLinkToken` cleanup job  ·  ~20 min

In the Celery app config (probably `apps/api/app/worker.py`):
```python
app.conf.beat_schedule = {
    "prune-expired-tokens": {
        "task": "app.worker.prune_expired_tokens",
        "schedule": 3600.0,   # every hour
    },
}
```

Define the task:
```python
@app.task
def prune_expired_tokens():
    """Delete MagicLinkToken rows that are expired AND unconsumed,
    plus any consumed rows older than 30 days."""
    threshold = utc_now() - datetime.timedelta(days=30)
    db.query(MagicLinkToken).filter(
        or_(
            and_(MagicLinkToken.consumed_at.is_(None),
                 MagicLinkToken.expires_at < utc_now()),
            MagicLinkToken.consumed_at < threshold,
        )
    ).delete(synchronize_session=False)
    db.commit()
```

Optional admin endpoint for manual trigger:
`POST /api/v1/admin/prune-tokens`.

### 4.6 `aware_utc` → SQLAlchemy `TypeDecorator`  ·  ~15 min

The consumer-side `aware_utc()` helper (in `apps/api/app/db.py` today)
wraps every value before persisting. Centralize on timezone-aware
column types so future contributors can't trip the same `TypeError`.

In `apps/api/app/db.py`:
```python
from sqlalchemy.types import DateTime, TypeDecorator

class TZDateTime(TypeDecorator):
    impl = DateTime(timezone=True)
    cache_ok = True
    def process_bind_param(self, value, dialect):
        if value is not None and value.tzinfo is None:
            from datetime import timezone
            return value.replace(tzinfo=timezone.utc)
        return value

AwareDateTime = TZDateTime  # alias for nicer imports
```

In `apps/api/app/models.py`: replace any
`mapped_column(DateTime, default=aware_utc)` with
`mapped_column(AwareDateTime)`.

Remove `aware_utc` from imports where it's no longer referenced.

**Acceptance**: `pytest -q` still passes (33 passed, 0 warnings), and
any `*_at` field in API responses serializes to ISO8601 with timezone
info (`+00:00` suffix or explicit `Z`).

---

## 5. Total effort budget

| Tier | Item | Effort | Resume impact |
|---|---|---|---|
| 1.1 | README.md                                    |  30 min | ★★★★★ |
| 1.2 | Public deploy                                |  60 min | ★★★★★ |
| 2.1 | B1 silence pytest warnings                   |  30 min | ★★    |
| 2.2 | C1 Settings / Integrations depth             |  30 min | ★★★   |
| 2.3 | C2 batch eval rerun                          |  30 min | ★★★   |
| 3.1 | Mobile responsiveness                        |  20 min | ★★    |
| 3.2 | Accessibility                                |  20 min | ★★    |
| 3.3 | Custom 404 + error pages                     |  10 min | ★★    |
| 3.4 | Open Graph meta                              |   5 min | ★     |
| 3.5 | Empty states audited                         |  15 min | ★     |
| 4.1 | Disable demo in production                   |   5 min | ★     |
| 4.2 | Rate limiting /auth + /ingest                |  20 min | ★★ (only real users) |
| 4.3 | CORS tightening                              |   5 min | ★★ (deploy-time)   |
| 4.4 | Prometheus /metrics                          |  30 min | ★★ (only real users)|
| 4.5 | MagicLinkToken cleanup                       |  20 min | ★     |
| 4.6 | aware_utc → TZDateTime TypeDecorator         |  15 min | ★★ (internal craft) |

**Forecasts**:
- Tier 1 + 2 → ~3-4 hours. Resume-ready.
- + Tier 3 → +1 hour (4-5 hours total). Portfolio-grade.
- + Tier 4 → +2-3 hours (6-8 hours total). Production-grade.

---

## 6. Done-state checklist (the executor runs this at the end)

- [ ] `README.md` exists at the repo root, ≥ 80 lines, renders cleanly,
      and every screenshot link resolves.
- [ ] Deployed URL `/api/v1/health` → 200.
- [ ] Deployed URL `/demo` lands on the dashboard with the demo cookie
      set across all 5 navigations (Dashboard, Runs, Run-detail,
      Compare, Evals).
- [ ] `cd apps/api && pytest -q` → 33 passed, **0 warnings**.
- [ ] `/settings` shows three new cards: "Install the SDK", "OTLP
      ingest curl", and the "Retention" segmented control.
- [ ] `/evals` shows a "Rerun all failing" button; clicking it reruns
      all currently-failing cases and refreshes the table within 5s.
- [ ] Mobile (375×812 viewport on Chrome DevTools): every page
      renders without a horizontal scrollbar on the page body.
- [ ] Every icon-only button has `aria-label="..."`.
- [ ] `not-found.tsx` exists and renders a friendly 404 with a
      "Back to dashboard" link and an "Open the demo" CTA.
- [ ] `apps/web/app/layout.tsx` exports metadata including
      `openGraph.images` pointing at `/screenshots/01-dashboard.png`.
- [ ] Re-captured 5 screenshots under `apps/web/public/screenshots/`
      reflect the current deployed build.

---

## 7. Cross-cutting guardrails

- **Don't break `scripts/start-dev.sh`.** It has been hardened for
  Windows Git Bash. The `pg_isready` wait, the `--max-time` curl
  probes, the cookie trap, and the `$ROOT/logs` logfile fallback
  are load-bearing.
- **Don't remove `credentials: "include"` from `apps/web/lib/api.ts`.**
  That fix is the linchpin of the auth flow. Verified end-to-end.
- **Don't revert Postgres to `:5432`**, Redis to `:6379`. The host's
  `recallradar-db` is squatting on `:5432`. Keep `:5433` / `:6380`.
- **Don't run `alembic downgrade` without a backup.** Seed data is
  not under alembic version control.
- **Don't delete `apps/web/public/screenshots/`.** They're referenced
  by the README and serve as proof points.
- **Don't introduce a new dependency** without checking that the
  package is licensed MIT/Apache and not adding > 5MB to the install
  size.

---

## 8. Capturing portfolio screenshots (appendix)

Use this recipe whenever you need new screenshots. The Chrome
user-data-dir pattern preserves the demo cookie across captures.

```bash
CHROME_BIN='C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
PROFILE_DIR='G:/AgentPatch/.chrome-profile'
OUT_DIR='G:/AgentPatch/apps/web/public/screenshots'

mkdir -p "$PROFILE_DIR" "$OUT_DIR"

# 1. Seed the demo cookie (one-time).
"$CHROME_BIN" --headless=new \
  --user-data-dir="$PROFILE_DIR" \
  --no-sandbox --disable-gpu --hide-scrollbars \
  --window-size=1440,2400 \
  --virtual-time-budget=15000 \
  --screenshot="$OUT_DIR/__seed.png" \
  http://localhost:3000/demo
sleep 2
rm -f "$OUT_DIR/__seed.png"

# 2. Capture each page with the same profile.
URLS=(
  "01-dashboard.png|http://localhost:3000/|10000"
  "02-runs.png|http://localhost:3000/runs|8000"
  "03-run-detail.png|http://localhost:3000/runs/7a1c41c3-e896-445f-8d42-61bba9e182aa|8000"
  "04-compare.png|http://localhost:3000/compare?a=7a1c41c3-e896-445f-8d42-61bba9e182aa&b=1afa8fd9-69c7-41f6-882f-2d60f3d688dc|12000"
  "05-evals.png|http://localhost:3000/evals|8000"
)
for entry in "${URLS[@]}"; do
  IFS='|' read -r name url vt <<< "$entry"
  "$CHROME_BIN" --headless=new \
    --user-data-dir="$PROFILE_DIR" \
    --no-sandbox --disable-gpu --hide-scrollbars \
    --window-size=1440,2400 \
    --virtual-time-budget="$vt" \
    --screenshot="$OUT_DIR/$name" \
    "$url"
  sleep 2   # let Next.js HMR / Chrome release the user-data-dir lock
done

# 3. Verify.
ls -la "$OUT_DIR"
```

Replace the run IDs above with whatever the current seed produces.
Pick a `:failures`-status run for `03` and a pair of failing runs for
`04`.

---

## 9. Worked-example execution order (recommended)

A clean order that builds confidence iteratively:

1. **Tier 1.1** — README. Cheap, immediately visible.
2. **Tier 2.1** — pytest warnings. Visible in tests immediately.
3. **Tier 2.2** — Settings depth. New UI cards, easy to verify.
4. **Tier 2.3** — Batch eval rerun. New endpoint + button.
5. **Re-capture screenshots** (now reflects the new Settings +
   Eval-Lab UI). Update the README screenshot paths if filenames
   changed.
6. **Tier 3.1** — Mobile responsiveness. Iterate page by page.
7. **Tier 3.2** — Accessibility. Keyboard-test each page.
8. **Tier 3.3** — Custom 404. Confirm `/this-does-not-exist`.
9. **Tier 3.4** — Open Graph meta. Confirm via [opengraph.xyz](https://www.opengraph.xyz/)
   or Slack preview.
10. **Tier 3.5** — Empty states. Visit each list page with empty data.
11. **Tier 1.2** — Deploy. Now the README has the live URL.
12. **Tier 4** — optional, in any order, only if onboard'ing real
    users.

---

## 10. Out-of-scope / explicit non-goals

- Implementing a real production observability stack (Datadog, Grafana
  Cloud, Honeycomb). Tier 4.4 only adds basic Prometheus.
- Authentication providers beyond magic-link (Google, GitHub OAuth).
  Out of scope for the portfolio build.
- Multi-tenancy beyond the existing `Project` scoping. The current
  row-level isolation via `project_id` is sufficient.
- A real billing / Stripe integration. Not on the roadmap.
- Mobile native (iOS/Android). Web responsive is the target.

End of final_steps. Good luck — and remember the 5-minute quickstart
in the README is the recruiter's first test.
