# Changelog

All notable changes to AgentPatch Studio. The format loosely follows [Keep a Changelog](https://keepachangelog.com); this repo is small enough that we keep entries short and route them by audience (the recruiter who clicks the live demo, the engineer who deploys their own fork, the maintainer who hunts regressions).

## [0.2.0] — current

The post-launch bugfix iteration. The free public demo at <https://agent-patch-studio-web.vercel.app> now stays warm and renders every page end-to-end on first click, even months after the last deploy.

### Added

- **GitHub Actions keep-alive cron** (`.github/workflows/keep-alive.yml`). A workflow that pings `https://agentpatch-api.onrender.com/api/v1/health` and `https://agent-patch-studio-web.vercel.app/` every 12 minutes. Stays well under Render's free-tier 15-minute idle window, and GitHub Actions cron drift is absorbed by the 12-minute cadence. Doubles as a passive health canary that emails the repo's assignees when something is genuinely broken.
- **Single-source-of-truth app version** (`apps/web/lib/version.ts`). The sidebar's `v{APP_VERSION}` footer label and all six `package.json` / `pyproject.toml` manifests now point to one canonical `0.2.0` literal. Bumping is one literal edit, not six.
- **Initial `CHANGELOG.md`** (this file). One-pass canonical record of what shipped since 0.1.0.

### Fixed

- **Demo workspace loop on first visit.** A fresh visitor landing at `/` was bounced to `/login?next=%2F` even after a successful session mint. Five layered fixes landed in sequence:
  - `apps/web/lib/api.ts` now SSR-forwards the demo + session cookies via `buildOutgoingCookieHeader()`, dynamic-imported from `next/headers` so the client bundle does not pull server-only modules.
  - `apps/web/app/demo/page.tsx` switched from `router.push("/")` to `window.location.href = "/"` to bypass the Next.js App Router's client-side Router Cache, which had memoised the initial 307 redirect and was replaying it after the cookie was set.
  - `apps/web/next.config.ts` now proxies every `/api/v1/:path*` through a Vercel rewrite to Render, so the browser-side fetch no longer depends on `NEXT_PUBLIC_API_BASE_URL` being set at build time (it was previously inlining a dev fallback that silently failed every production fet...
- **All non-`/` authed pages rendered as empty shells.** `/runs`, `/compare`, `/evals`, `/review`, `/settings` returned 200 OK but hit the "Server Components error" envelope because the client-side `useEffect` that called `/api/v1/auth/me` from `UserMenu` 401'd. Converted `apps/web/app/(app)/layout.tsx` from a `"use client"` fetcher to a Server Component that pre-fetches identity / projects / current project via SSR-cookie-forwarded `api()`, then hands the data to a new client `AppChrome` shell (`apps/web/app/(app)/_chrome.tsx`) + a project-switcher-aware `UserMenu` that no longer fetches on mount.
- **SSR fetches inside Vercel's same-origin rewrite dropped the explicit `Cookie` header**, leaving the dashboard render with empty `runs` / `workflows` / `analytics`, even though `curl -H 'Cookie: ...'` against the same URL returned 200. `lib/api.ts` now does SSR fetches via absolute URL (calls Render directly with the forwarded cookie) and keeps browser fetches on the relative path through the Vercel rewrite. A defensive `.catch(() => [])` on `getRuns()` / `getWorkflows()` in `(app)/page.tsx` keeps the page renderable even if a future Render cold-start throws.
- **`start.sh` race on first cold-boot.** `create_all` now fires inside the seed-check script (not deferred to the uvicorn startup hook), so a fresh Neon DB no longer surfaces an UndefinedTable error before the seed runs.

### Changed

- **`docs/deploy.md` Cold-start 502 section** now recommends the in-repo GitHub Actions cron workflow as the primary keep-alive, with UptimeRobot as an optional belt-and-suspenders — superseded by commit `a466243`.
- **Playwright smoke** (`apps/web/tests/e2e/smoke.spec.ts`) runs against the live URL on every push to `main` via `.github/workflows/smoke.yml`. Same workflow now coexists with the new cron keep-alive.
- The Playwright config (`apps/web/playwright.config.ts`) and CI workflow use `vars.PLAYWRIGHT_BASE_URL || 'https://agent-patch-studio-web.vercel.app'` so a future repo-fork deploy can override without editing the suite.

## [0.1.0] — initial public-demo MVP

Tagless; this entry retroactively captures the launch.

### Added

- **Three-package monorepo**: `apps/api` (FastAPI + SQLAlchemy 2 + Pydantic v2 + Alembic), `apps/web` (Next.js 16 App Router + React 19 + Tailwind 4), `packages/sdk-py` (Python ingest client), `packages/sdk-ts` (TypeScript ingest client), `packages/shared-types`.
- **`render.yaml` Blueprint**: one-click Render deploy with `healthCheckPath: /api/v1/health` and idempotent seed on cold-boot via `apps/api/start.sh`.
- **Idempotent demo seed** (`apps/api/scripts/seed.py`): 36 runs across 3 workflows, 6 eval cases, 18 eval results, 5 audit log entries.
- **One-command local bootstrap** (`scripts/start-dev.sh`): Postgres + Redis + MinIO via Docker Compose, then uvicorn + `next dev` with PID files in `api.pid` / `web.pid`.
- **Demo workspace UX** (`apps/web/app/demo/page.tsx` + `apps/web/app/login/page.tsx`): single `Open demo workspace` click mints a 24 h JWT cookie and routes the visitor into the seeded dashboard without signup.
- **Sidebar chrome** (`apps/web/app/(app)/layout.tsx` → `apps/web/app/(app)/_chrome.tsx` in 0.2.0), `UserMenu`, `ThemeToggle`, project switcher.
- **Audit log invariant**: every `requires_review=true` toggle writes an audit-log row visible via `/api/v1/projects/:id/audit-logs`.
- **Open Graph + favicon + Playwright smoke + portfolio polish**: 404 page, logout flow, OG meta, recruiter-facing README p...
- **Pre-public-deploy audit + visual polish** (commit `b07feaf`): a Sweep + design pass resolved all pre-launch security and design findings into the 0.1.0 codebase.

---

For the unreleased commit database ("known *current* HEAD"), `git log --oneline` is the canonical record. This file's purpose is the public-facing, curated one — the maintainer's choice of which fixes are worth naming.
