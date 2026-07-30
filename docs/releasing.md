# Releasing AgentPatch Studio

Step-by-step guide for publishing a GitHub Release from this repo. The first time you do this, the publishing surface is one click in the GitHub Releases form (most reliable, no token needed). After that, automation via `gh` CLI you already trust is fine.

The polished body for the **next release** is included verbatim below so you don't have to re-derive it. Update this file as part of each version bump.

---

## Pending release: v0.2.0

Tag `v0.2.0` already exists at commit `7ff0633`. Only the GitHub Release publish is missing.

### Title (paste verbatim)

```
AgentPatch Studio v0.2.0 — post-launch bugfix iteration
```

### Body (paste into a GitHub Release)

The bullet lists (Added / Fixed / Changed) are verbatim from `CHANGELOG.md`'s `[0.2.0]` section so the canonical audit trail is preserved. The opener paragraph (about what AgentPatch Studio IS, the live-demo URL, the free-tier stack) and the Quick-links footer are recruiter-facing additions that are NOT in `CHANGELOG.md`. Future bumps should re-derive the bullet sections from the new `CHANGELOG.md` `<next-version>` section, then either keep or revise the opener + footer based on what's useful for the new version's audience.

````markdown
**AgentPatch Studio** is an observability, replay, side-by-side diffing, and eval-from-failure platform for production LLM-agent workflows. Built for the moment an agent goes wrong — the support agent answers incorrectly, the compliance reviewer approves a contract it shouldn't have, the incident triager picks the wrong runbook. Captures every model call + tool call as a structured timeline, finds the first meaningful divergence between a broken run and a working one, replays from trace in three modes, and converts any production failure into a regression eval case in one click.

Free public demo at **<https://agent-patch-studio-web.vercel.app>** — open the seeded 36-run dashboard across 3 workflow archetypes (support-policy, IT-incident-triage, compliance-review) with one click. The whole stack is free-tier public deploys: Vercel + Render + Neon + Upstash, $0/month.

---

## What's in v0.2.0

The post-launch bugfix iteration. The public demo now stays warm and renders every page end-to-end on first click, even months after the last deploy.

### Added

- **GitHub Actions keep-alive cron** (`.github/workflows/keep-alive.yml`). Pings `https://agentpatch-api.onrender.com/api/v1/health` and `https://agent-patch-studio-web.vercel.app/` every 12 minutes. Stays well under Render's free-tier 15-minute idle window, and GitHub Actions cron drift is absorbed by the 12-minute cadence. Doubles as a passive health canary that emails the repo's assignees when something is genuinely broken.
- **Single-source-of-truth app version** (`apps/web/lib/version.ts`). The sidebar's `v{APP_VERSION}` footer label and all six `package.json` / `pyproject.toml` manifests now point to one canonical `0.2.0` literal. Bumping is one literal edit, not six.
- **Initial `CHANGELOG.md`**. One-pass canonical record of what shipped since 0.1.0.

### Fixed

- **Demo workspace loop on first visit.** A fresh visitor landing at `/` was bounced to `/login?next=%2F` even after a successful session mint. Five layered fixes landed in sequence:
  - `apps/web/lib/api.ts` now SSR-forwards the demo + session cookies via `buildOutgoingCookieHeader()`, dynamic-imported from `next/headers` so the client bundle does not pull server-only modules.
  - `apps/web/app/demo/page.tsx` switched from `router.push("/")` to `window.location.href = "/"` to bypass the Next.js App Router's client-side Router Cache, which had memoised the initial 307 redirect and was replaying it after the cookie was set.
  - `apps/web/next.config.ts` now proxies every `/api/v1/:path*` through a Vercel rewrite to Render, so the browser-side fetch no longer depends on `NEXT_PUBLIC_API_BASE_URL` being set at build time (was previously inlining a dev fallback that silently failed every production fetch).
- **All non-`/` authed pages rendered as empty shells.** `/runs`, `/compare`, `/evals`, `/review`, `/settings` returned 200 OK but hit the "Server Components error" envelope because the client-side `useEffect` that called `/api/v1/auth/me` from `UserMenu` 401'd. Converted `apps/web/app/(app)/layout.tsx` from a `"use client"` fetcher to a Server Component that pre-fetches identity / projects / current project via SSR-cookie-forwarded `api()`, then hands the data to a new client `AppChrome` shell (`apps/web/app/(app)/_chrome.tsx`) + a project-switcher-aware `UserMenu` that no longer fetches on mount.
- **SSR fetches inside Vercel's same-origin rewrite dropped the explicit `Cookie` header**, leaving the dashboard render with empty `runs` / `workflows` / `analytics`, even though `curl -H 'Cookie: ...'` against the same URL returned 200. `lib/api.ts` now does SSR fetches via absolute URL (calls Render directly with the forwarded cookie) and keeps browser fetches on the relative path through the Vercel rewrite. A defensive `.catch(() => [])` on `getRuns()` / `getWorkflows()` in `(app)/page.tsx` keeps the page renderable even if a future Render cold-start throws.

### Changed

- **`docs/deploy.md` Cold-start 502 section** now recommends the in-repo GitHub Actions cron workflow as the primary keep-alive, with UptimeRobot as an optional belt-and-suspenders — superseded by commit `a466243`.
- **Playwright smoke** (`apps/web/tests/e2e/smoke.spec.ts`) runs against the live URL on every push to `main` via `.github/workflows/smoke.yml`. Same workflow now coexists with the new cron keep-alive.
- The Playwright config (`apps/web/playwright.config.ts`) and CI workflow use `vars.PLAYWRIGHT_BASE_URL || 'https://agent-patch-studio-web.vercel.app'` so a future repo-fork deploy can override without editing the suite.

---

**Quick links**: [Live demo](https://agent-patch-studio-web.vercel.app) · [`render.yaml` Blueprint](https://github.com/connorpaps/AgentPatch-Studio/blob/main/render.yaml) (one-click Render deploy) · [5-minute quickstart in README](https://github.com/connorpaps/AgentPatch-Studio#5-minute-quickstart) · [v0.2.0 commit (`7ff0633`)](https://github.com/connorpaps/AgentPatch-Studio/commit/7ff0633) · [Full `CHANGELOG.md`](https://github.com/connorpaps/AgentPatch-Studio/blob/main/CHANGELOG.md)
````

---

## How to publish

The tag is already pushed. Publishing a Release is the final step.

### Path A — GitHub Web UI (60 s, most reliable; `gh` not installed, no token needed)

1. Open **https://github.com/connorpaps/AgentPatch-Studio/releases/new?tag=v0.2.0** in your browser while logged in.
2. **Release title**: paste the title block above.
3. **Describe this release**: paste the body block above (verbatim — the markdown between the ` ```markdown ` and ` ``` ` fences).
4. Confirm **"Set as the latest release"** is checked (it should be — this is the only release).
5. Click **Publish release**.

### Path B — `gh` CLI (one-time install + auth, then 30 s thereafter)

```bash
# Install: https://cli.github.com  (Windows: `winget install GitHub.cli`).
gh auth login
awk '/^```markdown$/{capture=!capture; next} capture' docs/releasing.md > /tmp/release-body-0.2.0.md
gh release create v0.2.0 \
  --repo connorpaps/AgentPatch-Studio \
  --title "AgentPatch Studio v0.2.0 — post-launch bugfix iteration" \
  --notes-file /tmp/release-body-0.2.0.md
# `gh release create --notes-file` reads the temp file. The awk line above
# extracts JUST the body block (between the ```markdown fences) so the
# recipe, verify-after-publish, and future-release sections don't leak
# into the published GitHub Release page.
```

(If you only want to reference the markdown body without the wrapper text, copy `Body (paste verbatim)` into a temp file and point `--notes-file` at that.)

### Path C — `curl` with a personal-access token (scriptable, 10 s)

```bash
export GITHUB_TOKEN='ghp_your_personal_access_token_with_repo_scope'

# Pull body from this doc file (everything between the two ```markdown fences)
BODY=$(awk '/^```markdown$/{capture=!capture; next} capture' docs/releasing.md)

curl -sS -X POST https://api.github.com/repos/connorpaps/AgentPatch-Studio/releases \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H 'Accept: application/vnd.github+json' \
  -H 'X-GitHub-Api-Version: 2022-11-28' \
  -d "$(jq -n \
    --arg tag "v0.2.0" \
    --arg sha "7ff0633" \
    --arg name "AgentPatch Studio v0.2.0 — post-launch bugfix iteration" \
    --arg body "$BODY" \
    '{tag_name:$tag, target_commitish:$sha, name:$name, body:$body, draft:false, prerelease:false}')"
```

Pipe through `jq '.html_url'` to get the published URL.

---

## Verify after publish

```bash
# 1. Listing should now show 1 release (was 0 before publish)
curl -sS https://api.github.com/repos/connorpaps/AgentPatch-Studio/releases \
  | python -c "import json,sys; d=json.load(sys.stdin); print(f'{len(d)} release(s)'); \
      [print(f'  {r[\"tag_name\"]} - {r[\"name\"]} - {r[\"html_url\"]}') for r in d]"

# 2. Direct release page should return 200
curl -sS -o /dev/null -w 'HTTP %{http_code}\n' \
  https://github.com/connorpaps/AgentPatch-Studio/releases/tag/v0.2.0
```

Expected first-probe output:

```
1 release(s)
  v0.2.0 - AgentPatch Studio v0.2.0 — post-launch bugfix iteration - https://github.com/connorpaps/AgentPatch-Studio/releases/tag/v0.2.0
```

---

## Future releases — the recipe

For every subsequent version bump:

1. Bump `APP_VERSION` in `apps/web/lib/version.ts` to the new version + propagate to the six manifests per the comment at the top of `version.ts`.
2. Add a section to `CHANGELOG.md` (`## [<next-version>]`).
3. `git commit -m "release: v<next>"` + `git push origin main`.
4. `git tag v<next> && git push origin v<next>`.
5. Update this `docs/releasing.md` — replace the "Pending release" header content with the new version + new tag SHA + new body. The body should source verbatim from the matching `CHANGELOG.md` section, but augmented with the recruiter-facing opener + Quick-links footer (this file is the canonical body source for releases; `CHANGELOG.md` is the canonical audit trail).
6. Publish via Path A (or B / C if you have `gh` / a token handy).

For automated future publishes without manual steps, add `release-drafter/release-drafter@v5` at `.github/workflows/release.yml` and this doc becomes a one-time reference rather than a per-version manual.
