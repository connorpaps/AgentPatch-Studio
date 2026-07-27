# Deploy AgentPatch Studio

One-command setup that produces a public demo URL the README's **Live demo** link points at.

## Stack

| Layer | Service | Cost |
|-------|---------|------|
| Next.js frontend | Vercel | $0 (free hobby tier) |
| FastAPI backend | Render (Docker web service) | $0 (free; sleeps after 15 min idle) |
| Postgres | Neon | $0 (free tier, auto-suspend) |
| Redis | Upstash | $0 (free tier, 10k requests/day) |
| Object storage | (none — gated by `S3_ENABLED=false`) | $0 |

All four vendor free tiers must be claimed separately; total monthly bill for the public demo is **$0**.

## 1. Create the free accounts

1. **Neon** — [neon.tech](https://neon.tech) → sign up with GitHub → New Project → region: pick the closest to your target Render region (Oregon recommended) → copy the **pooled** connection string (it has `-pooler` in the hostname). It looks like:
   ```
   postgresql://neondb_owner:...@ep-xxx-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
2. **Upstash** — [upstash.com](https://upstash.com) → sign up with GitHub → Create Database → type: Regional → region: same as Neon → copy the **Redis URL** (it's `rediss://...`).
3. **Render** — [render.com](https://render.com) → sign up with GitHub → no card required for the free tier anymore (Render reintroduced free in 2025).
4. **Vercel** — [vercel.com](https://vercel.com) → sign up with GitHub.

## 2. Deploy the FastAPI to Render

> Either use the Blueprint one-click flow, or the manual UI flow. The Blueprint is faster if you have the creds pasted in.

### Option A — Blueprint (one-click)
1. Render dashboard → **New +** → **Blueprint**.
2. Connect the repo `github.com/connorpaps/AgentPatch-Studio`.
3. Render auto-detects `render.yaml` from the repo root → click **Apply**.
4. Once the service is created, open its **Environment** tab and set:
   - `DATABASE_URL` — paste the Neon pooled connection string.
   - `REDIS_URL` — paste the Upstash URL (starts with `rediss://`).
   - `FRONTEND_ORIGIN` — *leave blank for now*, set after step 3.
   - `AGENTPATCH_API_KEY` — generate a strong random 32+ char secret (`openssl rand -base64 32`).
5. Render auto-deploys. **Then:** open Render's **Environment** tab on the new service, copy the auto-generated `AGENTPATCH_API_KEY` value (Render's `generateValue: true` minted it on first apply), and paste it into Vercel's `NEXT_PUBLIC_API_KEY` env (see step 3). The two values MUST match exactly or the build-time default in the web app drifts from the real API key, and the /settings page default will look "wrong" to recruiters.
6. Watch the Logs tab; you should see:
   ```
   [start.sh] Waiting for Postgres (...)
   [start.sh] Postgres ready after Ns.
   [start.sh] AGENTPATCH_AUTO_SEED=1 -- checking if seed is needed...
   [start.sh] runs table is empty -- seeding demo data...
   [seed.py] == Support-policy workflow ==
   ...
   [start.sh] Seed complete.
   [start.sh] Starting uvicorn on :8000...
   ```
6. Note the public URL — it will be `https://agentpatch-api.onrender.com`.

### Option B — Manual
1. Render dashboard → **New +** → **Web Service** → connect the GitHub repo.
2. **Environment**: Docker.
3. **Root Directory**: `apps/api`.
4. **Dockerfile Path**: `./Dockerfile` (auto-detected).
5. **Plan**: Free.
6. Add the env vars from step A.4 above.
7. **Create Web Service**.

## 3. Deploy the Next.js to Vercel

1. Vercel dashboard → **Add New…** → **Project** → import `github.com/connorpaps/AgentPatch-Studio`.
2. **Framework Preset**: Next.js (auto-detected).
3. **Root Directory**: `apps/web`.
4. **Build Command**: leave default (`next build`). The monorepo's `package.json` workspaces are auto-resolved by Vercel's turbo-aware install.
5. **Environment Variables**:
   - `NEXT_PUBLIC_API_BASE_URL` = `https://agentpatch-api.onrender.com` (paste the Render URL from step 2).
   - `NEXT_PUBLIC_API_KEY` = the same `AGENTPATCH_API_KEY` you set in Render.
6. **Deploy**.
7. Note the public URL — it will be `https://agentpatch-studio.vercel.app` (or `https://agentpatch-studio-<hash>.vercel.app`).

## 4. Wire the cookie URL back into Render

1. Back in Render's env vars for `agentpatch-api`: set `FRONTEND_ORIGIN` = the Vercel URL from step 3 (no trailing slash).
2. Save → Render auto-redeploys.

## 5. Smoke-test the public demo

1. Open the Vercel URL in a private window.
2. Click **Open demo workspace** (or directly visit `/demo`).
3. You should land in the demo workspace asking you to mint a demo cookie. Click it.
4. After that, `/runs`, `/compare`, `/evals`, `/review` should all populate with the 36 seeded runs.

If you see **"bounced to /login"** on any protected route, see the **Cookie cross-origin trap** section below.

## 6. Update the README live-demo link

Edit `README.md`, replace the line:

```md
> **Live demo:** coming soon — see [5-minute quickstart](#5-minute-quickstart) below to run locally in one command.
```

with the Vercel URL you noted in step 3, then push to `main`. Render auto-redeploys the API; Vercel auto-redeploys the web.

## Cookie cross-origin trap

The single most common deploy-day bug is the **cross-origin cookie is silently dropped**, so the demo cookie never reaches the API and every protected route bounces to `/login`. The reasons + the fix:

| Symptom | Root cause | Fix |
|---------|-----------|-----|
| Demo cookie minter returns 200 but `/auth/me` 401s | Cookie is `SameSite=Lax` on a cross-origin request | Set `AGENTPATCH_SECURE_COOKIES=true` in Render env. `_set_jwt_cookie` flips the cookie to `SameSite=None; Secure`. |
| `/auth/me` still 401s after the cookie flip | Frontend is calling from `http://` not `https://` | Vercel serves HTTPS by default; this fix is automatic. Local dev still uses HTTP, leave `AGENTPATCH_SECURE_COOKIES=false` locally. |
| Cookies flip but CORS still rejects cross-origin requests | `CORSMiddleware` allow_origins doesn't list the Vercel URL | `FRONTEND_ORIGIN` env must exactly match the deployed Vercel origin (no trailing slash, no path). |
| CORS happy, cookie sent, API returns 200 with empty body | Cookies set with `Domain=` mismatch | Don't set a cookie Domain; we rely on the issuing host's domain. `_set_jwt_cookie` already does this. |
| Render cold-start gives a 502 for the first request | Free-tier web service sleeps after 15 min idle | Open `/api/v1/health` once on a schedule (UptimeRobot) or accept the ~30s cold-start penalty. The seed only runs on cold-start when the runs table is empty, so subsequent requests are instant.

## Cold-start 502

Render's free-tier web services suspend after 15 minutes of inactivity. The first request after a suspension takes ~30 seconds to wake the container. During cold boot, the API and the website both briefly show an error or a blank page. Two practical mitigations:

1. **Acceptable for portfolio:** Just leave it. When a recruiter clicks the README's Live demo link on a Monday morning, they wait 30s and see the full app. Polished and fine.
2. **Always-warm option:** Sign up at [UptimeRobot](https://uptimerobot.com) (free, 50 monitors) and configure a 14-minute ping against `https://agentpatch-api.onrender.com/api/v1/health`. This keeps the container warm \u2014 no cold-start penalty, ever.

Note: Vercel doesn't have an analogous cold-start problem on the free tier \u2014 the Next.js frontend is always warm. |

### One-shot diagnostic

From your terminal:

```bash
VercelURL="https://agentpatch-studio.vercel.app"
curl -i "$VercelURL/api/v1/health" --resolve "$(echo $VercelURL | sed 's|https://||' ):443:127.0.0.1" -k 2>/dev/null
```

…won't actually work over DNS. Skip this and instead run this in a browser dev tools network panel:

1. Open the Vercel URL.
2. DevTools → Network → click the `POST /api/v1/auth/demo` request.
3. Under **Response Headers**, look for `set-cookie: agentpatch.session=...`. The cookie attributes must include `SameSite=None; Secure` for the public deploy.

If the cookie is missing or has wrong attributes, check Render env vars — `AGENTPATCH_SECURE_COOKIES` and `FRONTEND_ORIGIN` must be set exactly.

## Cost notes

| Behavior | Cost |
|---------|------|
| First cold start of the day after the free-tier service suspended | Free (the first request of the day takes ~30s while Render wakes the container; subsequent requests are instant) |
| Ste</newString>
| Steady-state demo traffic (< 10k Upstash commands/day) | $0 |
| Demo seed re-runs only on empty DB, so re-deploys are cheap | $0 |
| Custom domain (if you own one) | $0 in Render+Vercel; ~$10-15/yr at registrar |

## Rollback

If the live demo breaks, the old GitHub commit's containers keep running on Render/Vercel for free until you re-deploy. To roll back:

- **API**: Render → service → **Manual Deploy** → pick an older commit.
- **Web**: Vercel → project → **Deployments** → Promote an older deployment to production.

Both happen in one click without losing data (Neon keeps the PostgreSQL data through rollbacks since the schema is forward-compatible).
