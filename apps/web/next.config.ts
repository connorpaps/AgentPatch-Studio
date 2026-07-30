import type { NextConfig } from "next";

/**
 * The web app proxies every /api/v1/* call to the upstream API through
 * a same-origin Vercel rewrite.
 *
 * Why this matters: prior to this commit, the BROWSER had to know the
 * upstream URL at build time so it could fetch /api/v1/* directly. That
 * meant NEXT_PUBLIC_API_BASE_URL had to be set on Vercel's BUILD step,
 * otherwise the client bundle was inlined with the dev fallback
 * "http://localhost:8000" -- which silently failed every client-side
 * fetch in production, and /runs, /compare, /evals, /review looked like
 * "nothing loaded". The dashboard still worked because its fetch runs
 * in a Server Component that reads the runtime env on each request; the
 * broken pages were all "use client" components baked at build time.
 *
 * With the rewrite, the browser calls same-origin /api/v1/* and Vercel's
 * edge proxies to the upstream with the browser's cookies automatically
 * forwarded. NEXT_PUBLIC_API_BASE_URL stops being a build-time
 * requirement. lib/api.ts dropped its hardcoded "localhost:8000"
 * fallback and now uses the relative path directly.
 *
 * Resolve the upstream in this order:
 *   1. Explicit NEXT_PUBLIC_API_BASE_URL (set in dev .env.local or
 *      Vercel project env to override the defaults).
 *   2. Vercel deploy target -- the deployed Render service. Set as
 *      default so a fresh Vercel project works out of the box.
 *   3. localhost:8000 -- the default for `uvicorn app.main:app` on a
 *      laptop dev setup where VERCEL_ENV is undefined.
 */
const UPSTREAM =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "") ||
  (process.env.VERCEL_ENV
    ? "https://agentpatch-api.onrender.com"
    : "http://localhost:8000");

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${UPSTREAM}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
