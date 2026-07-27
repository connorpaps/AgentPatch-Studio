# AgentPatch Studio — Documentation

This folder holds the project's planning + spec documents. They were consolidated here from the repo root as part of the pre-GitHub cleanup.

## Product + spec

- **[spec.md](./spec.md)** — the full product + technical spec for AgentPatch Studio. Start here if you want to understand what the app is supposed to do and why.
- **[skills-brief.md](./skills-brief.md)** — companion to the spec: a tight list of the skills.sh categories worth installing for this stack, and the ones to avoid.

## Implementation status + roadmap

- **[roadmap.md](./roadmap.md)** — the original MVP implementation roadmap. Phases 1–5 are checked off; this is now historical.
- **[final-steps.md](./final-steps.md)** — the next tier of work after MVP-complete: portfolio + deploy polish.
- **[remaining-work.md](./remaining-work.md)** — feature gaps vs. spec, prioritized.
- **[remaining-work-leftover.md](./remaining-work-leftover.md)** — items from `remaining-work.md` that still needed wiring after the last session.

## Where to look in the repo

| You want… | Look in… |
|---|---|
| App (Next.js) | `apps/web/` (also see `apps/web/README.md` + `apps/web/AGENTS.md` + `apps/web/CLAUDE.md`) |
| API (FastAPI) | `apps/api/` |
| TypeScript SDK | `packages/sdk-ts/` |
| Python SDK | `packages/sdk-py/` (also see `packages/sdk-py/README.md`) |
| One-command local dev | `scripts/start-dev.sh` |
| End-to-end smoke test | `scripts/verify-restart.py` |
| Schema migrations | `apps/api/alembic/` |
| Docker stack | `docker-compose.yml` |
| Build tooling | root `package.json` (workspaces) |