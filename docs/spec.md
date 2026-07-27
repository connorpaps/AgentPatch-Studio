# AgentPatch Studio — Technical Product Spec for Kimi K2.7 Code in Cursor

AgentPatch Studio is a production-style web application for **debugging, replaying, comparing, evaluating, and improving AI agents**. It is not another end-user chatbot. It is a developer and ops tool for teams building AI agent workflows who need to understand why an agent failed, where it went wrong, how to test a fix, and how to stop the same failure from shipping again.[cite:24][cite:74][cite:77]

The market case for this product is strong in 2026 because teams are discovering that shipping an AI agent is easier than keeping it accurate, safe, observable, and accountable in production. Observability, evaluation, governance, and tool-call tracing are major priorities in the current agent engineering stack.[cite:11][cite:19][cite:24][cite:64]

This document is written as a build brief for Kimi K2.7 Code inside Cursor. It should be treated as a product and architecture spec, not as marketing copy.

## Product goal

Build a visually exceptional web app that lets developers and AI teams do the following:

- Connect one or more AI agent workflows to AgentPatch through SDK events, tracing hooks, or OpenTelemetry-style telemetry.[cite:80][cite:86][cite:93]
- Inspect every run of an AI agent as a structured, visual timeline of prompts, model calls, retrieved context, tool calls, outputs, errors, costs, and latency.[cite:24][cite:80]
- Compare a failed run against a successful run to identify where behavior diverged.[cite:74][cite:78]
- Replay prior runs in a controlled way to reproduce bugs and test fixes.[cite:74][cite:77]
- Tag likely root causes such as retrieval failure, bad tool use, hallucination, poor prompt instructions, timeout, formatting breakage, or missing human escalation.[cite:79][cite:78]
- Convert real failures into eval cases and regression suites so teams can catch the same class of failure before redeploying.[cite:69][cite:24]
- Offer a patch workflow where a developer can modify prompt templates, tool permissions, retrieval settings, fallback rules, or model selection, then rerun tests against historical traces.[cite:72][cite:74]

## Plain-English explanation

In simple terms, AgentPatch is a **debugger for AI agents**.

If a normal software system breaks, a developer looks at logs, stack traces, exceptions, and failing lines of code. AI agents are different because they may not “crash” in the traditional sense. They often fail by choosing the wrong tool, retrieving the wrong document, misreading a screenshot, misunderstanding a user request, or taking a bad reasoning path while still returning a 200 response.[cite:70][cite:92]

AgentPatch exists to make that kind of failure visible and fixable. It shows what the agent did step by step, helps locate where it went wrong, and gives the team a workflow to patch and retest the agent until the failure is resolved.[cite:24][cite:77][cite:78]

## Resume and portfolio value

This project is strong for the 2026 job market because it demonstrates:

- Full-stack product engineering.
- AI systems engineering, not just model API usage.
- Observability and telemetry design.
- Enterprise workflow thinking.
- Evaluation and regression infrastructure.
- Human-in-the-loop and governance awareness.
- Strong frontend visualization and developer UX.
- Practical integration with real AI tools and tracing standards.[cite:11][cite:24][cite:31][cite:64]

A recruiter should be able to understand the value quickly: this is a tool that helps engineering teams **inspect, diagnose, repair, and improve production AI agent workflows**.

## Core product concept

AgentPatch Studio should feel like a mix of:

- APM / observability dashboard.
- Debugger and trace explorer.
- QA / eval lab for agents.
- Workflow replay console.
- Diff viewer for AI runs.
- Incident investigation UI.

The product should be designed for users such as:

- AI engineers.
- Full-stack engineers building agent features.
- ML platform engineers.
- Product teams shipping RAG or workflow automation.
- Internal tooling and developer productivity teams.
- Security or compliance reviewers checking agent behavior.

## Primary user stories

### User story 1 — investigate a failure

A developer sees that an AI support agent answered incorrectly. They open AgentPatch, search for the failed run, inspect the timeline, see which documents were retrieved, review the tool calls, and identify that the retrieval filter returned stale policy docs.[cite:24][cite:74]

### User story 2 — compare good vs bad behavior

A developer compares two runs of the same workflow: one successful and one failed. AgentPatch highlights differences in prompt version, model choice, retrieval results, tool sequence, elapsed time, and output quality so the team can understand what changed.[cite:74][cite:78]

### User story 3 — replay and patch

A developer updates the prompt template, retrieval threshold, or tool permission rule, then replays historical runs through a test harness. AgentPatch shows whether the fix improved the outcome and whether it broke other cases.[cite:69][cite:74]

### User story 4 — review risky outputs

A compliance or ops reviewer opens a queue of suspicious or low-confidence runs, reviews sensitive outputs, tags failure type, and escalates cases that require a human approval step before future execution.[cite:31][cite:79]

### User story 5 — build regression coverage

A team turns real production failures into eval cases with expected outcomes and uses those evals as release gates before deploying a new agent workflow version.[cite:69][cite:72]

## Hugging Face task alignment

The product itself is an agent tooling platform, but it should still use several Hugging Face task types from the screenshot as part of real workflows and evaluation scenarios.

Recommended tasks to support in product demos, seeded datasets, or built-in evaluators:

- **Document Question Answering** — inspect whether an agent answered based on the correct PDF or policy document.
- **Table Question Answering** — verify agent behavior on tabular data such as pricing matrices or operational reports.
- **Visual Question Answering** — test whether the agent correctly interpreted screenshots, dashboards, forms, or UI states.
- **Image-to-Text** — capture text from screenshots or uploaded images used in a run.
- **Automatic Speech Recognition** — transcribe voice input or call recordings used by multimodal agents.
- **Summarization** — summarize long traces, transcripts, or run histories.
- **Text Classification** — classify failures by root-cause category.
- **Zero-Shot Classification** — route novel failures into probable categories before human review.
- **Sentence Similarity** — cluster similar failures and detect recurring incidents.
- **Text Ranking** — rank the most likely relevant traces, prompts, documents, or prior fixes.
- **Translation** — support multilingual runs and cross-language debugging.
- **Graph Machine Learning** — optional stretch feature for modeling workflow relationships, repeated failure paths, and tool dependency networks.

This makes the app feel grounded in the Hugging Face ecosystem while still staying focused on agent tooling.

## MVP definition

The MVP should be scoped to one polished end-to-end path:

1. A sample AI agent or workflow sends traces to AgentPatch.
2. AgentPatch stores runs, spans, tool calls, retrieved docs, outputs, costs, and errors.
3. The UI shows a run timeline and detailed step inspector.
4. Users can compare two runs side by side.
5. Users can create or review root-cause tags.
6. Users can generate eval cases from failed runs.
7. Users can rerun those eval cases after a patch.

Do **not** try to build universal compatibility with all frameworks in version 1.


## MVP first milestone

Start with one narrow, working slice before building the full platform. The first milestone should be:

- project scaffold and auth stub,
- one demo agent workflow,
- one run ingestion path,
- one trace timeline page,
- one run inspector panel,
- one compare view between two runs,
- one simple eval creation flow.

## MVP definition of done

The MVP is done when the app can:

- ingest and display a run,
- show nested spans and tool calls,
- inspect inputs, outputs, and artifacts,
- compare a failed run against a successful run,
- create an eval case from a failure,
- rerun that eval case against a patched workflow,
- present the above in a clean, professional UI.

## Scope control

Do not overbuild the first version. Avoid extra agent layers, extra services, unnecessary vendor tools, or speculative abstractions unless they are needed to ship the MVP cleanly.

## Demo workflow choice

Begin with one demo workflow only. Prefer a support-policy agent or incident-triage agent as the initial use case, then expand later only after the core trace, compare, and eval flows are working.

## Feasibility statement

Yes, this is possible as a web app.[cite:80][cite:86][cite:93]

The key idea is that AgentPatch does not need to magically attach to any agent in existence. It only needs one or more instrumented agents to send structured telemetry and events to the app. Modern agent frameworks and observability approaches already support this through APIs, middleware hooks, SDK callbacks, or OpenTelemetry conventions for model calls, tool use, token usage, and latency.[cite:80][cite:81][cite:85]

The recommended build strategy is:

- Build one demo agent or one demo agent framework integration.
- Instrument it with structured events and spans.
- Send those events to the AgentPatch backend.
- Visualize the results in a web UI.
- Add replay and eval layers on top.

## Product architecture

### High-level architecture

The system should have five major layers:

1. **Instrumented agent runtime** — one or more demo agents or external AI workflows.
2. **Ingestion API** — endpoints that receive runs, spans, tool calls, events, and annotations.
3. **Storage and indexing layer** — database + optional object storage + search index.
4. **Analysis services** — diffing, summarization, eval generation, clustering, and root-cause suggestion.
5. **Frontend application** — visual trace explorer, replay UI, compare views, dashboards, and review queues.

### Recommended architecture diagram in words

- Agent app starts a run.
- Each model call and tool call emits telemetry.
- Telemetry is sent to AgentPatch via REST or OTLP ingestion.[cite:80][cite:93]
- Backend normalizes the data into run / span / event / artifact tables.
- Analysis workers compute derived outputs like summaries, diffs, clusters, tags, cost breakdowns, and anomaly scores.
- Frontend reads normalized and derived data through an authenticated API.
- Users investigate failures and optionally trigger replays or eval jobs.

## Integration model

### Integration option A — custom SDK (best for MVP)

Build a lightweight AgentPatch SDK in TypeScript and Python.

The SDK should expose helpers such as:

- `startRun()`
- `startSpan()`
- `recordModelCall()`
- `recordToolCall()`
- `recordRetrievedDocuments()`
- `recordArtifact()`
- `recordError()`
- `endSpan()`
- `endRun()`
- `recordFeedback()`

This is the easiest and most controllable path for your first integration.

### Integration option B — OpenTelemetry / OTLP ingestion

Support OpenTelemetry GenAI-style tracing as a second integration path. This is strategically valuable because GenAI observability conventions already define standard structures for model calls, token counts, tool interactions, and optional content capture.[cite:80][cite:81][cite:85]

MVP support can be basic:

- Accept OTLP-like JSON via a REST adapter.
- Map spans into internal run records.
- Persist attributes like model, latency, tokens, prompt version, tool name, and tool result.

### Integration option C — framework adapters

Later, build adapters for common agent frameworks or wrappers around them. Examples could include agent runtimes built with common orchestration libraries, but do not make this part of the initial core scope.

## Backend requirements

### Recommended stack

- **Language:** TypeScript or Python.
- **Web API:** FastAPI or NestJS.
- **Database:** PostgreSQL.
- **Cache / queue:** Redis.
- **Background jobs:** Celery, Dramatiq, BullMQ, or Temporal if ambitious.
- **Object storage:** S3 or compatible blob storage for large artifacts.
- **Search:** PostgreSQL full-text at first, optional OpenSearch or vector search later.
- **Auth:** NextAuth, Clerk, Auth.js, or Supabase Auth depending on stack choice.

### Recommended choice for this project

A good build path is:

- **Frontend:** Next.js + TypeScript.
- **Backend API:** FastAPI.
- **Database:** PostgreSQL.
- **Queue:** Redis + BullMQ if using Node, or Redis + Celery if using Python.
- **Storage:** S3-compatible blob storage.
- **Realtime:** WebSockets or Server-Sent Events for live trace updates.

That combination is strong for a solo builder and still looks professional.

## Frontend requirements

### Frontend goals

The frontend must be a major selling point, but it should do that through clarity and polish rather than visual noise. The app should feel like premium workplace software that engineers would genuinely want open all day: calm, focused, modern, and highly legible.

The visual direction should be:

- Minimal and professional first, visually impressive second.
- Clean enterprise-grade product design, not flashy AI-demo design.
- Spacious layout with strong whitespace and calm hierarchy.
- A trace viewer that is the visual focal point, supported by a narrow inspector panel.
- Clear typography, thin dividers, restrained surfaces, and subtle elevation.
- Limited color usage, where color signals state and importance rather than decoration.
- Smooth but understated motion when expanding steps, opening inspectors, switching tabs, or comparing runs.

### Design brief

The design should move toward a cleaner and more mature observability-tool aesthetic rather than a dense futuristic dashboard. It should feel credible in a professional engineering workplace, attractive to recruiters, and visually distinct through restraint and product taste instead of visual excess.

Preferred characteristics:

- Quiet, premium interface with a strong sense of order.
- Left navigation, central trace canvas, and right-side inspector as the primary layout pattern.
- Light or soft-neutral surfaces are acceptable if they make the product feel cleaner and more workplace-ready; dark mode can still exist, but the product does not need to be aggressively dark-first.
- Emphasis on readability, scanability, and calm information density.
- Dashboard surfaces should feel editorial and precise rather than busy or widget-heavy.
- The product should look custom-designed, not like a reused admin template.

### Palette guidance

Use a restrained palette that feels refined and modern in a real business setting. Avoid high-saturation accents, neon glows, purple-blue gradient clichés, and cyberpunk styling.

Preferred palette direction:

- Base neutrals: warm white, soft stone, mist gray, muted slate, light graphite.
- Primary accent: restrained teal or blue-green, used sparingly for active states, selected tabs, progress bars, and key highlights.
- Status colors: subtle green for success, muted amber for warnings, muted red for errors.
- Borders: very light neutral dividers rather than heavy outlines.
- Shadows: soft, shallow, and nearly invisible.

The app should look expensive, understated, and practical. The palette should support long sessions without fatigue.

### Layout guidance

The default screen should not feel crowded. Prioritize fewer panels with clearer hierarchy over many simultaneous widgets.

Layout rules:

- The primary page should center on one run and its trace timeline.
- Top-level KPIs should be compact and limited to the most meaningful metrics only.
- Keep the left sidebar clean and structured with clear grouping.
- Keep the right inspector narrow and highly readable.
- Let the central trace canvas breathe with generous spacing.
- Prefer tabs and progressive disclosure over stacking too many cards.
- Keep charts secondary; they support the workflow but should not dominate the screen.

### Visual focal points

The UI should have a few memorable moments, but they should come from product interaction design rather than decoration.

Recommended focal moments:

- A beautifully designed trace timeline with elegant span bars, divergence markers, and light grid structure.
- A clean side inspector with run metadata, inputs, outputs, and root-cause summary.
- A compare view that highlights the first meaningful divergence between two runs.
- A compact summary row that immediately communicates latency, cost, tokens, and failure state without overwhelming the user.

### Explicit anti-patterns

Do not generate a noisy AI-dashboard aesthetic. Avoid the following:

- Neon accents or glowing effects.
- Too many charts on one screen.
- Overly dark, high-contrast cyberpunk styling.
- Gradient-heavy cards or bright colored panels.
- Dense widget grids that bury the main workflow.
- Generic SaaS admin-template UI.
- Decorative complexity that does not improve investigation.

### Quality bar

The final design should feel like something between a modern observability platform, a premium internal developer tool, and a clean productivity product. At first glance, the reaction should be: this looks polished, modern, trustworthy, and like real software used by serious teams.

### Core frontend pages

#### 1. Overview dashboard

Purpose:

- Show run volume, error rate, average latency, token cost, frequent failure types, and top failing workflows.
- Highlight anomalies and new regression clusters.

Widgets:

- KPI cards.
- Failure trend chart.
- Cost over time chart.
- Top workflows table.
- Recent critical failures feed.
- Cluster heatmap.

#### 2. Runs explorer

Purpose:

- Search and filter runs.
- Filter by workflow, prompt version, model, failure tag, tool, date, reviewer, severity, customer tenant, or environment.

UI ideas:

- Table + faceted filters.
- Mini sparkline on each workflow row.
- Badges for status, severity, and regression membership.

#### 3. Run details / trace viewer

This is the core page.

Sections:

- Header with run metadata.
- Step timeline in the left pane.
- Detailed inspector in the right pane.
- Tabs for prompt, output, tool payload, retrieved docs, logs, screenshots, and metrics.
- Cost and latency breakdown panel.
- Root-cause suggestion card.
- Annotation and feedback panel.

Each step should show:

- Step type: user input, system prompt, model call, retrieval, tool call, response parse, guardrail, human review, final output.
- Start and end timestamps.
- Duration.
- Tokens in / out.
- Tool name or model name.
- Status: success, warning, failure, retry.
- Linked artifacts.

#### 4. Compare view

Side-by-side comparison of two runs.

Diff dimensions:

- Prompt version.
- Model and temperature.
- Retrieved documents.
- Tool order.
- Tool arguments.
- Intermediate summaries.
- Latency per step.
- Cost per step.
- Final answer.
- Human rating.

Visual features:

- Divergence markers.
- Color-coded diffs.
- Timeline sync scrolling.
- “First major divergence” callout.

#### 5. Eval lab

Purpose:

- Create eval cases from production failures.
- Define expected outcomes.
- Run patched versions against historical cases.
- Track pass/fail and score changes.

Capabilities:

- Eval dataset table.
- Eval detail page.
- Batch rerun button.
- Regression comparison view.
- Scorecards over time.

#### 6. Review queue

Purpose:

- Let reviewers inspect low-confidence or policy-sensitive runs.
- Add labels, notes, escalation tags, and approval requirements.

#### 7. Settings / integrations

Purpose:

- API keys.
- SDK instructions.
- OTLP endpoint configuration.
- Project environments.
- Redaction controls.
- Retention rules.

## Backend domain model

Recommended primary entities:

### Project

Represents a workspace or product team.

Fields:

- `id`
- `name`
- `slug`
- `created_at`
- `owner_id`

### Environment

Examples: local, staging, prod.

Fields:

- `id`
- `project_id`
- `name`
- `is_production`

### Workflow

Represents an agent or agent workflow definition.

Fields:

- `id`
- `project_id`
- `name`
- `type`
- `description`
- `framework`
- `current_version`

### Run

Represents one execution of a workflow.

Fields:

- `id`
- `workflow_id`
- `environment_id`
- `external_run_id`
- `status`
- `started_at`
- `ended_at`
- `duration_ms`
- `total_input_tokens`
- `total_output_tokens`
- `estimated_cost_usd`
- `root_span_id`
- `user_query`
- `final_output`
- `failure_type`
- `severity`
- `score`
- `requires_review`

### Span

Represents a nested step in a run.

Fields:

- `id`
- `run_id`
- `parent_span_id`
- `span_type`
- `name`
- `status`
- `started_at`
- `ended_at`
- `duration_ms`
- `model_name`
- `tool_name`
- `input_tokens`
- `output_tokens`
- `estimated_cost_usd`
- `prompt_version`
- `temperature`
- `metadata_json`

### Artifact

Represents attached documents, screenshots, transcripts, images, logs, or evaluation outputs.

Fields:

- `id`
- `run_id`
- `span_id`
- `artifact_type`
- `storage_url`
- `mime_type`
- `filename`
- `metadata_json`

### RetrievedDocument

Fields:

- `id`
- `span_id`
- `source_name`
- `source_uri`
- `chunk_id`
- `rank`
- `score`
- `content_snippet`
- `metadata_json`

### Annotation

Fields:

- `id`
- `run_id`
- `span_id`
- `user_id`
- `label`
- `note`
- `created_at`

### EvalCase

Fields:

- `id`
- `project_id`
- `source_run_id`
- `name`
- `description`
- `expected_behavior`
- `input_payload_json`
- `gold_output_json`
- `tags`

### EvalResult

Fields:

- `id`
- `eval_case_id`
- `workflow_version`
- `run_id`
- `score`
- `passed`
- `judge_reason`
- `created_at`

## API design

### Public ingestion API

#### `POST /api/v1/runs/start`
Start a run.

Payload example:

```json
{
  "project_key": "demo-project",
  "workflow_name": "support-agent",
  "environment": "staging",
  "external_run_id": "run_123",
  "input": {
    "user_query": "Can I get a refund for my annual plan?"
  },
  "metadata": {
    "customer_tier": "pro",
    "channel": "chat"
  }
}
```

#### `POST /api/v1/spans`
Create or update a span.

```json
{
  "run_id": "...",
  "parent_span_id": null,
  "span_type": "model_call",
  "name": "policy_answer_generation",
  "status": "success",
  "started_at": "2026-07-26T20:00:00Z",
  "ended_at": "2026-07-26T20:00:04Z",
  "model_name": "Kimi K2.7 Code",
  "input_tokens": 1240,
  "output_tokens": 211,
  "estimated_cost_usd": 0.013,
  "metadata": {
    "temperature": 0.2,
    "prompt_version": "v12"
  }
}
```

#### `POST /api/v1/tool-calls`
Store tool invocation details.

```json
{
  "run_id": "...",
  "span_id": "...",
  "tool_name": "search_policy_docs",
  "arguments": {
    "query": "annual plan refund policy"
  },
  "result": {
    "documents": ["policy-2024.pdf"]
  },
  "status": "success",
  "duration_ms": 812
}
```

#### `POST /api/v1/retrievals`
Store retrieved document metadata.

#### `POST /api/v1/artifacts`
Store linked screenshots, PDFs, transcripts, or logs.

#### `POST /api/v1/runs/end`
Close a run.

#### `POST /api/v1/feedback`
Attach user or reviewer feedback.

### Internal application API

#### `GET /api/v1/runs`
List runs with filters.

#### `GET /api/v1/runs/:id`
Get one run with nested spans, artifacts, tool calls, retrievals, metrics, and annotations.

#### `GET /api/v1/runs/:id/compare/:otherId`
Return a structured diff between two runs.

#### `POST /api/v1/evals/from-run/:id`
Create an eval case from a failed run.

#### `POST /api/v1/evals/:id/rerun`
Replay an eval case against a selected workflow version.

#### `POST /api/v1/replays/:runId`
Trigger replay of a stored run.

#### `POST /api/v1/annotations`
Create root-cause annotations or reviewer notes.

## Replay system design

Replay is one of the hardest but most impressive features.

### MVP replay approach

Do not attempt full deterministic replay of every external system.

Instead, support three replay modes:

1. **Metadata replay** — show the historical run as a simulation without re-executing external calls.
2. **Partial replay** — rerun model calls while reusing saved tool outputs or retrieved documents.
3. **Full replay** — rerun against live tools and APIs, only for approved demo scenarios.

This lets the app stay honest about what can and cannot be reproduced.

### Replay dependencies

To support replay, store:

- Input payload.
- Prompt version.
- Model config.
- Tool arguments.
- Tool outputs or output snapshots.
- Retrieved documents or document IDs.
- Environment metadata.

## Root-cause analysis layer

Build a root-cause engine that can suggest likely failure classes.

### Suggested failure taxonomy

- Retrieval mismatch.
- Stale or low-quality source data.
- Wrong tool selection.
- Wrong tool argument generation.
- Hallucinated answer.
- Output formatting failure.
- Timeout / retry loop.
- Model policy refusal.
- Missing human escalation.
- Multimodal parsing failure.
- Cross-step state loss.

### Implementation approach

For MVP:

- Use rule-based heuristics first.
- Add zero-shot classification for auto-suggested tags.
- Let human reviewers confirm or override the suggestion.

This is a good example of a practical AI-human hybrid workflow.

## Analysis and intelligence features

### 1. Trace summarization

Use summarization models or an LLM to produce:

- One-sentence run summary.
- One-sentence failure explanation.
- Developer-facing patch suggestion.

### 2. Similar failure clustering

Use embeddings or sentence similarity to group related failures.[cite:29]

Possible UX:

- “This failure looks similar to 18 earlier cases.”
- “Most common fix was updating retrieval filters.”

### 3. Patch recommendation engine

For MVP, make this heuristic, not magical.

Example outputs:

- “Prompt version changed between success and failure.”
- “Retrieved documents had lower average rank score.”
- “The failed run skipped a verification tool used in successful runs.”
- “The response parser threw a formatting error after a longer-than-normal output.”

### 4. Cost and latency insights

Show:

- Cost per run.
- Cost by workflow.
- Cost by step type.
- Token-heavy spans.
- Slowest tools.
- Error-prone model configurations.

## Real-world data and demo scenarios

To make the project feel real, include demo workflows using practical scenarios.

Best demo scenarios:

### Demo scenario A — customer support policy agent

- Inputs: support chats, policy PDFs, screenshots, account tables.
- Failure modes: wrong policy retrieval, hallucinated refund rules, stale source docs, formatting breakage.
- HF tasks used: Document QA, Table QA, Image-to-Text, Summarization, Classification.

### Demo scenario B — IT incident triage agent

- Inputs: tickets, screenshots, logs, runbooks, voice notes.
- Failure modes: wrong runbook lookup, misunderstood screenshot, missed escalation.
- HF tasks used: Visual QA, ASR, Summarization, Text Ranking, Document QA.

### Demo scenario C — compliance review agent

- Inputs: policy documents, spreadsheets, meeting transcripts, multilingual text.
- Failure modes: wrong clause extraction, multilingual misinterpretation, bad risk classification.
- HF tasks used: Translation, Document QA, Table QA, Text Classification, Sentence Similarity.

## Security and privacy considerations

This section matters because it makes the app feel like serious enterprise tooling.

### Must-have controls

- API key authentication for ingestion.
- Role-based access control.
- Redaction mode for sensitive prompt or output content.
- Project-level isolation.
- Environment-level separation.
- PII masking for stored traces.
- Artifact retention settings.
- Signed URLs for private artifacts.
- Audit log for reviewer actions.

### Content capture modes

Support three privacy levels:

1. **Metadata only** — store timing, model names, token counts, and status, but not raw prompts or outputs.
2. **Redacted content** — store content after pattern-based redaction.
3. **Full content** — store complete prompts and outputs only for approved projects.

## Deployment and infra

### Dev environment

- Docker Compose for local development.
- Services: frontend, API, Postgres, Redis, object storage emulator if needed.

### Production-friendly deployment

- Frontend on Vercel.
- Backend on Railway, Fly.io, Render, or AWS.
- PostgreSQL managed instance.
- Redis managed instance.
- S3-compatible storage.
- OpenTelemetry collector optional for advanced ingestion.[cite:80]

### Environment variables

Need variables such as:

- `DATABASE_URL`
- `REDIS_URL`
- `S3_BUCKET`
- `S3_REGION`
- `S3_ACCESS_KEY`
- `S3_SECRET_KEY`
- `JWT_SECRET`
- `NEXT_PUBLIC_API_BASE_URL`
- `OTLP_INGESTION_ENABLED`
- `CONTENT_REDACTION_MODE`

## Engineering roadmap

### Phase 1 — foundation

- Monorepo setup.
- Auth.
- Database schema.
- Run and span ingestion endpoints.
- Sample agent SDK.
- Basic dashboard.

### Phase 2 — trace UX

- Runs explorer.
- Run detail page.
- Timeline UI.
- Artifact viewer.
- Filters and search.

### Phase 3 — compare and annotations

- Side-by-side compare view.
- Diff engine.
- Annotation system.
- Root-cause tagging.

### Phase 4 — eval lab

- Create eval from run.
- Eval dataset UI.
- Batch rerun job flow.
- Result scoring.

### Phase 5 — replay and intelligence

- Replay modes.
- Failure clustering.
- Patch suggestions.
- Cost analysis.

### Phase 6 — polish

- Motion design.
- Empty states.
- Seed data.
- Demo workflows.
- Documentation.
- Portfolio screenshots and video.

## Suggested folder structure

```text
agentpatch/
  apps/
    web/
    api/
    worker/
  packages/
    sdk-ts/
    sdk-py/
    shared-types/
    ui/
  infra/
    docker/
    migrations/
  docs/
    architecture.md
    api.md
    onboarding.md
```

## Suggested frontend component structure

```text
web/
  app/
    dashboard/
    runs/
    compare/
    evals/
    review/
    settings/
  components/
    trace/
    diff/
    charts/
    filters/
    artifacts/
    layout/
  lib/
    api/
    types/
    hooks/
```

## Suggested backend modules

```text
api/
  src/
    auth/
    projects/
    workflows/
    runs/
    spans/
    tool_calls/
    retrievals/
    artifacts/
    annotations/
    evals/
    replay/
    analytics/
```

## UX quality bar

The UI should be portfolio-worthy because it feels calm, mature, and deeply considered. The visual impression should come from confidence and usability, not from visual overload.

### Design guidance

- Prioritize cleanliness, calm spacing, and workplace credibility.
- Make the trace viewer the clear hero feature.
- Use compact KPI cards only where they support fast understanding.
- Keep typography crisp and understated.
- Use motion only to clarify transitions and focus changes.
- Make every screen feel intentionally edited rather than crowded.
- Design for long-session usability, not just screenshot appeal.

### Visually impressive moments

- A trace timeline that feels elegant and easy to parse at a glance.
- A polished inspector panel with concise summaries and high readability.
- A compare mode that reveals divergence with subtle but clear visual emphasis.
- Artifact previews that feel integrated and lightweight.
- A clean investigation flow where the user always knows where to look next.

## Non-goals for MVP

Do not include these in the first version unless time remains:

- Universal support for every AI framework.
- Full deterministic replay for arbitrary external APIs.
- Complex multi-tenant billing.
- Fine-grained enterprise SSO.
- Full self-hosted observability competitor parity.
- Autonomous patching that changes production agents automatically.

## What makes this technically impressive

This project is impressive because it combines:

- Modern web app engineering.
- Realtime data ingestion.
- Nested trace visualization.
- AI workflow observability.
- Evaluation infrastructure.
- Workflow replay.
- Multimodal artifact handling.
- Practical AI/ML features like clustering, summarization, classification, and retrieval analysis.
- Serious product thinking around privacy, review, and reliability.

## Sample build prompt for Kimi K2.7 Code in Cursor

Use this as the initial implementation instruction:

> Build a production-style full-stack web application called AgentPatch Studio. It is a debugging, replay, comparison, and evaluation platform for AI agent workflows. Use Next.js + TypeScript for the frontend, FastAPI for the backend, PostgreSQL for primary storage, Redis for background jobs, and S3-compatible blob storage for artifacts. Implement a polished dark-mode UI with a premium developer-tool aesthetic. Start with authentication, project/workflow/run/span schema, ingestion endpoints, a TypeScript SDK for instrumenting one demo agent, and core UI pages for dashboard, runs explorer, run detail trace viewer, and compare view. The app must support storing model calls, tool calls, retrieval results, token counts, latency, costs, artifacts, and annotations. Add an eval flow that can generate an eval case from a failed run and rerun that case against a patched workflow version. Architect the code cleanly for future OTLP/OpenTelemetry ingestion and replay modes. Prioritize production-quality structure, thoughtful types, clean component composition, and realistic sample data over superficial speed.

## Questions that should be answered before coding deeply

These questions should be resolved before major implementation begins:

1. Which backend stack should be chosen for the first version: FastAPI or NestJS?
2. Should the first demo agent be a support-policy agent, IT incident agent, or compliance-review agent?
3. Should the first integration path be a custom SDK only, or custom SDK plus basic OTLP ingestion?
4. Should auth be simple email/password, magic link, or a third-party provider?
5. How much real content should be stored in traces: metadata only, redacted content, or full content for demos?
6. Should replay in MVP be metadata replay only, or include partial replay?
7. Is the first goal a pure portfolio demo or a partially reusable internal tool framework?

## Recommended choices if no answers are provided

If no answers are provided, default to:

- FastAPI backend.
- Next.js frontend.
- PostgreSQL + Redis.
- Custom TypeScript SDK for MVP.
- One support-policy agent demo workflow.
- Metadata replay + partial replay.
- Redacted content mode by default.
- Dark-mode premium UI.
- No multi-tenant complexity beyond project workspaces.

## Final positioning statement

AgentPatch Studio is a web-based debugging and repair console for AI agents. It connects to instrumented agent workflows through SDK hooks or OpenTelemetry-style tracing, captures runs and tool behavior, visualizes failures as structured traces, helps developers compare good and bad outcomes, generates evals from real incidents, and supports a patch-and-rerun workflow for improving production AI systems.[cite:24][cite:77][cite:80]
