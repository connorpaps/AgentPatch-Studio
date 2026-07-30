/**
 * APP_VERSION -- single source of truth for the user-visible version
 * label rendered in the (app) sidebar footer AND the public demo
 * "latest release" surfaces (this file's literal is the canonical
 * reference; root + apps/web + packages/sdk-ts + packages/shared-types
 * manifests + apps/api + packages/sdk-py pypro.toml all pin to the
 * same string but are not auto-rewritten by tsc / build / webpack).
 *
 * Bumping:
 *   1. Update the literal below.
 *   2. Sync the `version` field in root `package.json`,
 *      `apps/web/package.json`, `packages/sdk-ts/package.json`,
 *      `packages/shared-types/package.json`, `apps/api/pyproject.toml`,
 *      and `packages/sdk-py/pyproject.toml` to match.
 *   3. Add a `CHANGELOG.md` entry under the new version header.
 *
 * Current: 0.2.0 -- the post-launch bugfix iteration. Earlier fixes
 * shipped under 0.1.0 (initial public-demo MVP); 0.2.0 captures the
 *   - four demo-flow fixes (cookie forward, Router Cache bypass,
 *     Vercel rewrite, SSR-prefetch, SSR-absolute-URL)
 *   - GitHub Actions keep-alive cron
 *   - this single-source-of-truth versioning refactor.
 */
export const APP_VERSION = "0.2.0";
