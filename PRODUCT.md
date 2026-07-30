# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Three **co-equal** audiences confirmed in the init interview. The product UI must serve all three in parallel without compromising any one.

- **On-call engineer at 2am.** Staring at a misbehaving production agent: the support agent refunded the wrong amount, the compliance reviewer approved a contract it should not have, the incident-triage agent picked the wrong runbook. They need to find the first divergence, ship a fix, and defend that fix the next time something similar happens.
- **Agent platform / eval engineer.** Owns the regression suite, monitors cost + latency, defends the agents in production over months. They instrument the SDKs, curate the failure taxonomy, and watch the Eval Lab trend chart to confirm a patch actually moved the needle.
- **Founding-team solo builder / recruiter portfolio reader.** The public demo URL doubles as the product storyboard. They click "Open demo workspace" and walk through 36 seeded runs + 6 eval cases without an account. The demo URL is part of the spec.

## Product Purpose

AgentPatch Studio is an observability + replay + eval-from-failure platform for production LLM-agent workflows. It captures every model call, tool call, and retrieval span a multi-step agent makes, lays the run out as a structured timeline, and lets the engineer diagnose the failure, reproduce it after a fix, and lock the fix in as a regression eval.

Success is concrete: a failure moves from "the support agent refunded the wrong amount in production" to "the patched run passes a freshly-created eval case in under an hour, with the diff between broken and fixed visible at first glance, and the next similar incident appears in the audit log alongside the prior fix."

## Positioning

The mechanism most observability peers (LangSmith, Helicone, Datadog LLM Observability, Phoenix) cannot truthfully copy is **failure → diff → replay → regression** as one tightly-coupled loop on a single structured timeline:

1. **Side-by-side diff** between a broken and a working run, with first-divergence surfacing on input/output, retrieval, span sequence, duration, and tool choice. No neighboring tool truthfully calls itself a "diff product" for agent runs.
2. **Replay-from-trace** in three modes — `metadata` (show the simulation), `partial` (re-run model calls, reuse tool/retrieval outputs), `full` (re-run model + read-only demo tools, gated behind `ALLOW_FULL_REPLAY=true`). Replay produces a real new Run, not a hypothetical recreation.
3. **Eval-from-failure** — a single click on any failed run materializes an `EvalCase` bound to that failure's input + gold output; the Eval Lab shows a real trend of pass/fail as the patched workflow is rerun.

None of the three is novel in isolation; the combination, owned by a single structured timeline, is the position. Vector-DB tools do retrieval debugging without agent context. APM tools do traces without an agent timeline. Neither owns eval-from-production.

## Operating Context

- **Workflow type:** multi-step LangChain / LangGraph / CrewAI / openai-agents / custom-framework agent workflows. Each step is one of: `model_call`, `tool_call`, `retrieval`, `guardrail`, `human_review`, `output`, `chain` (parent span).
- **Capture pipeline:** `agentpatch` Python SDK (`packages/sdk-py`), `@agentpatch/sdk` TypeScript SDK (`packages/sdk-ts`), raw REST API, or OTLP-style JSON ingest (`POST /api/v1/ingest/otlp`) for adapters that already emit OTLP.
- **Storage layer:**
  - Postgres (Neon free-tier on the public demo, self-hosted Postgres 16 in local dev via `docker-compose.yml`).
  - Redis (Upstash free-tier in prod, Redis 7 in dev) for Celery task dispatch.
  - Optional S3/MinIO for artifact bytes; the public demo has `S3_ENABLED=false` and artifact rows stay slim.
- **Pre-seeded archetypes** in `apps/api/scripts/seed.py`:
  - **`support-policy-agent`** — Document QA + summarization + classification (refund/policy questions).
  - **`it-incident-triage-agent`** — Severity classification + postmortem retrieval + runbook lookup + escalation.
  - **`compliance-review-agent`** — Document parsing + translation + policy-clause retrieval + risk classification.
- **Working materials** the engineer actually touches on a real failure: the run timeline (`apps/web/components/span-timeline.tsx`), the run inspector (`apps/web/components/run-inspector.tsx`), the compare view (`apps/web/app/(app)/compare/page.tsx`), the Eval Lab (`apps/web/app/(app)/evals/page.tsx`), the review queue (`apps/web/app/(app)/review/page.tsx`), and the audit log card (`apps/web/components/audit-log-card.tsx`).
- **Deployment reality:** Vercel hosts the Next.js studio at $0/mo; Render hosts the FastAPI service on the free tier (sleeps after 15 minutes idle, ~30s cold-start); Neon + Upstash host Postgres + Redis free. A recruiter's Monday-morning click costs the cold-start penalty once, then sees the full surface.

## Capabilities and Constraints

**Capabilities** (each backed by a code surface):

- **Ingest** runs + spans + tool calls + retrievals + annotations + artifacts via the SDKs or raw REST. Endpoints: `/api/v1/runs`, `/api/v1/spans`, `/api/v1/tool-calls`, `/api/v1/retrievals`, `/api/v1/artifacts`, `/api/v1/annotations`.
- **Inspect** a run as a parent/child span tree with prompt, payload, tool args/output, retrieved documents, latency bars, token counts, cost. Server-rendered timeline; right-rail inspector.
- **Analyze** a run: heuristic root-cause via `app/services/analysis.py:suggest_failure_type`; LLM-based summary + failure-explanation + patch-suggestion via the Celery `summarize_run_task`. Pre-analyzed fields populate during seed so the timeline page renders without a click.
- **Compare** two runs side-by-side: `GET /api/v1/runs/{a}/compare/{b}`. Aligns spans by name+type; surfaces output, duration, retrieved-document, and span-sequence divergences. Deep links work via `/compare?a=…&b=…`.
- **Replay** in three modes. `full` is gated behind `ALLOW_FULL_REPLAY=true`. `partial` re-runs `model_call` spans with the LLM and reuses tool/retrieval outputs; `full` additionally re-executes read-only demo tools (`calculator`, `current_time`, or anything routable through the safe AST evaluator in `app/services/replay.py:_safe_eval`).
- **Eval-from-failure:** `POST /api/v1/evals/from-run/{id}` materializes an `EvalCase`. Eval Lab trend chart shows pass/fail history per case.
- **Review queue** for any run flagged `requires_review=true`. `PATCH /api/v1/runs/{id}/review-status` writes an `AuditLog` row visible in `/api/v1/projects/{id}/audit-logs`.
- **Capture modes** per project: `metadata_only` / `redacted` / `full`. Redaction masks emails, phones, SSNs in string fields; runs on write, not retroactively.

**Constraints:**

- Render free-tier sleep + 30s cold-start on the public demo (acceptable for portfolio).
- `full` replay is gated behind `ALLOW_FULL_REPLAY=true` because re-executing arbitrary agent tools in production is unsafe.
- Demo JWTs are read-only scoped (`runs:read`, `evals:read`). Only real sessions (`runs:write` etc.) or API keys can mutate.
- Capture-mode changes do not retroactively redact existing spans. The redaction pipeline runs on write.
- The 9-bucket failure taxonomy is a closed list. Adding a bucket requires a coordinated SDK + API + frontend + seed change.
- Free-tier quotas (Neon PITR limits, Upstash 10k commands/day, Vercel hobby limits) bound the public demo to roughly seed volume.

**Open product decisions** (deliberately undecided; each one is an *inferred* gap, not a confirmed "out of scope"):

- Formal multi-tenant RBAC beyond per-project API key scoping (today multi-project is implicit).
- Webhook alerts on new failures — currently polling-only.
- Per-team notification fan-out and email digests.
- Streaming-token support — current token counts are post-run, not in-flight.
- Native mobile surfaces (iOS / Android). The web studio is the canonical surface today.

## Brand Commitments

- **Name:** `AgentPatch Studio`. The word "Patch" is a deliberate metaphor — inspect-then-patch. The wordmark renders as `AgentPatch` in uppercased Geist Mono (see `apps/web/components/brand/agentpatch-wordmark.tsx`). The mark is the octagon-with-inner-inspection-notch in `agentpatch-mark.tsx`. **Do not rename, abbreviate (`AP`), or stylize.**
- **Voice:** direct, technical, friendly, pull-quote-driven (confirmed). Pull-quotes are the house style — examples in product copy and the README should be lifted, not paraphrased. The line "the difference between 'we shipped' and 'we shipped a fix' is roughly a thousand token-decisions" is canonical.
- **Type stack:** Geist (sans) + Geist_Mono (mono) loaded via `next/font/google` in `apps/web/app/layout.tsx`. Font variables wired through `globals.css` `@theme inline`. Preserve unless the user explicitly retires them.
- **Color:** single brand accent — teal — with a side-by-side desaturated semantic palette (success / warning / error / info, each one stop darker than the equivalent Tailwind shade so they sit calmly next to teal). Token source-of-truth is `apps/web/app/globals.css`. Light theme: teal-600 (`#0d9488`). Dark theme: teal-400 (`#2dd4bf`). **One accent, no second accent.**
- **Branding assets the user did not bind:** the octagon glyph (the AgentPatch mark), the `agentpatch.session` cookie name, the `agentpatch.demo` presence cookie. These are product surfaces, not yet advertised as primary brand assets; treat them as replaceable.

## Evidence on Hand

The product has these confirmed assets. Future work must not fabricate customers, testimonials, logos, percentages, or comparisons beyond the list below.

- **Live demo URL:** `https://agent-patch-studio-web.vercel.app` — recruiter-facing one-click mint; rounds-trip the demo cookie within ~1s after `POST /api/v1/auth/demo`.
- **Seeded demo data** (`apps/api/scripts/seed.py`, run idempotently on cold-start by `apps/api/start.sh` when the `runs` table is empty):
  - 36 runs across 3 workflows.
  - 6 eval cases (with patch history the Eval Lab trend chart visualizes).
  - 18 eval results.
  - 5 audit log entries captured during annotation and review actions.
- **Failure taxonomy with patch hint** — copy lives in `apps/api/app/services/analysis.py` (`FAILURE_TAXONOMY`) and is surfaced verbatim on the run detail page.
- **Three workflow archetypes** with realistic 2026-era failure traces (Globex / Initech / Cyberdyne / Umbrella / Soylent / Wayne / Aperture / Tyrell counterparties; modern `Claude Sonnet 4.6` / `Kimi K2.7 Code` / `GPT-5` / `Gemini 2.5 Pro` model profiles).
- **Working OpenAPI surface:** `/docs` (FastAPI default), 16 routers under `/api/v1`.
- **Test coverage:** 9 FastAPI test files (`tests/test_smoke.py`, `test_auth.py`, `test_projects.py`, `test_replays.py`, `test_audit.py`, `test_tasks.py`, `test_artifacts.py`, `test_health_rich.py`, `test_cors_origins.py`); 1 Playwright smoke spec against the deployed URL.
- **In-product screenshots:** `apps/web/public/screenshots/` — runs explorer, run detail, compare view, evals (referenced from the README).
- **Free-tier deploy runbook:** `docs/deploy.md` — Vercel + Render + Neon + Upstash for $0/mo with every cross-origin cookie gotcha documented.

**Future work MUST NOT fabricate:**

- Customer logos or named-customer case studies. (None exist.)
- Recruiter or end-user testimonials. (None exist.)
- Third-party benchmarks vs other agent-observability tools. (None exist; claims in copy are positioning, not measurement.)
- Pricing tiers or SLAs. (None exist beyond the documented free-tier topology.)
- Press coverage or awards. (None.)

## Product Principles

Five durable strategic principles derived from the confirmed interview and the README. None are visual recipes; all describe what future work should preserve.

1. **Structure beats prose.** Every failure surfaces as a timeline, a diff, and a regression in three clicks or fewer. The product prefers a structured surface (span tree, diff table, eval result row) over a wall of narrative explanation.
2. **Diff is the diagnostic.** There is no agent-debugging UX without a before/after comparison. Any future surface that explains a failure should make the working and broken runs visible together.
3. **Reproducibility is non-negotiable.** Every fix must be reproducible from the trace. Replay in any mode produces a *real* new Run, not a hypothetical recreation; the eval case that locks the fix lives in the same database.
4. **Failure taxonomies are products, not afterthoughts.** The 9-bucket taxonomy is not a UI label — it shapes how the user reads the timeline, how patch hints surface, and how Eval Lab validates a fix. Adding a bucket costs SDK + API + frontend + seed work, and that burden is intentional.
5. **The demo workspace is the spec.** The public demo URL doubles as a storyboard. Recruiters click "Open demo workspace" and walk through 36 seeded runs + 6 eval cases without an account; that walk has to look the same as the production walk. The seed script is part of the spec.

## Accessibility & Inclusion

**Commitment (documented target, not yet enforced):** **WCAG 2.2 AA** (user-confirmed in this init interview).

The platform has not yet been put through an axe-core / Lighthouse audit; the next visual pass through `$impeccable audit apps/web` is the natural gate.

**What the codebase already does without needing rewrite:**

- Semantic HTML inherited from Next.js + React; `next/font/google` for native font subsetting.
- Keyboard-navigable sidebar (`apps/web/app/(app)/layout.tsx`).
- Focus-visible rings on buttons, links, inputs across `apps/web/components/ui/button.tsx` and form controls via Tailwind defaults.
- Theme toggle persisted in `localStorage` (`apps/web/components/theme-toggle.tsx`) so both palette preferences get correct contrast tokens.
- `prefers-reduced-motion` honored in `WelcomeHero`, `Marquee`, and other animated surfaces via motion's `useReducedMotion` hook.
- Color contrast tuned via `globals.css` — teal-600 on stone-50 ≈ 5.5:1 for body text; teal-400 on stone-950 ≈ 7:1 for body text.

**Pending accessibility work** (recorded as a backlog for `$impeccable audit`, **not** invented as done — these are code-grep observations, not user-confirmed risks):

- Replay confirm modal (`apps/web/components/replay-button.tsx`) — keyboard-trap risk on `AlertTriangle` modal; may need explicit focus-return-to-trigger and ESC handling.
- Eval Lab rerun form (`apps/web/app/(app)/evals/page.tsx`) — the four `<input>` controls lack `htmlFor`-bound labels.
- Span tree in `span-timeline.tsx` — currently a flat button-list; would benefit from `role="tree"` + arrow-key navigation as a deeper keyboard story.
- Color-only signals — failure cards in the compare view rely on red-50/red-100 backgrounds paired with text only; needs a non-color redundancy check.

**Documented downgrade path** (recorded, not adopted): if a hard WCAG AA target proves too ambitious for a future demo deadline, the degraded posture is "WCAG A + best-effort AA on the most-touched surfaces." This is undecided unless explicitly adopted.
