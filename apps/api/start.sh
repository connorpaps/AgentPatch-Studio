#!/usr/bin/env bash
# apps/api/start.sh
# Production entrypoint for the FastAPI container.
#
# Behavior:
#   1. Wait up to 120s for Postgres to be reachable (Render free tier takes
#      30-60s to provision the network route to Neon; without this loop
#      uvicorn crashes on first request).
#   2. If AGENTPATCH_AUTO_SEED=1, run the demo seed ONLY if the runs
#      table is empty. Idempotent -- never destroys existing data.
#   3. Run Alembic migrations head (opt-in via RUN_ALEMBIC=1).
#   4. exec uvicorn so SIGTERM propagates correctly for Render's
#      graceful shutdown.
#
# This script is the source of truth for cold-start demo data. Without
# it every fresh Render deploy would show an empty database, and
# visitors would see a blank /runs page.
#
# Failure isolation: every step after the Postgres wait is wrapped so a
# transient issue cannot stop uvicorn from starting. /health staying up
# is more important than the seed running perfectly on the very first
# boot.

set -euo pipefail

log() { printf "\033[1;34m[start.sh]\033[0m %s\n" "$*" >&2; }

cd /app

# 1. Wait for Postgres using psycopg2 against $DATABASE_URL.
log "Waiting for Postgres..."
ready=0
for i in $(seq 1 120); do
  if python -c "
import os, sys, psycopg2
url = os.environ.get('DATABASE_URL', '')
if not url: sys.exit('DATABASE_URL is not set')
try:
    conn = psycopg2.connect(url, connect_timeout=2)
    conn.close()
    sys.exit(0)
except Exception:
    sys.exit(1)
" >/dev/null 2>&1; then
    log "Postgres ready after ${i}s."
    ready=1
    break
  fi
  if [ "$i" = "120" ]; then
    log "Postgres did not become ready within 120s; starting uvicorn anyway."
    ready=0
    break
  fi
  sleep 1
done

# 2. Idempotent demo seed (only runs if AGENTPATCH_AUTO_SEED=1).
# Runs in a subshell so a Python error cannot abort start.sh under
# `set -e`. The seed is best-effort; uvicorn must always start.
if [ "${AGENTPATCH_AUTO_SEED:-0}" = "1" ]; then
  log "AGENTPATCH_AUTO_SEED=1 -- checking if seed is needed..."
  seed_result=$(
    python -c "
import os, sys
os.environ.setdefault('AGENTPATCH_API_KEY', 'change-me-in-production')
os.environ.setdefault('LLM_PROVIDER', 'mock')
try:
    # Ensure schema exists BEFORE the count query. AUTO_CREATE_TABLES
    # in main.py fires on the uvicorn startup hook, which only runs
    # AFTER this script exec()s uvicorn. Without this create_all here,
    # a fresh Neon DB has zero tables, the count query raises
    # UndefinedTable, the except-branch silently labels it CHECK_FAILED,
    # and the seed gets skipped -- leaving the recruiter's first click
    # staring at an empty /runs page. Idempotent on subsequent boots.
    from app.db import Base, SessionLocal, engine
    from app.models import Run
    Base.metadata.create_all(bind=engine)
    s = SessionLocal()
    try:
        n = s.query(Run).count()
    finally:
        s.close()
    if n == 0:
        print('EMPTY')
    else:
        print('POPULATED:' + str(n))
except Exception as exc:
    print('CHECK_FAILED: ' + repr(exc), file=sys.stderr)
    print('CHECK_FAILED')
" 2>/tmp/seed-check.stderr || true
  )
  case "$seed_result" in
    EMPTY)
      log "runs table is empty -- seeding demo data..."
      if [ "${AGENTPATCH_DROP_TABLES:-0}" != "1" ]; then
        log "AGENTPATCH_DROP_TABLES!=1 -- idempotent seed (no drop_all)."
        export AGENTPATCH_DROP_TABLES=0
      fi
      (cd /app && python scripts/seed.py) \
        || log "Seed run failed; uvicorn will still start so /health works. See above for the cause."
      log "Seed complete."
      ;;
    POPULATED:*)
      log "runs table already has ${seed_result#POPULATED:} rows -- skipping seed."
      ;;
    CHECK_FAILED|*)
      log "seed-check failed (see /tmp/seed-check.stderr) -- skipping seed, starting uvicorn."
      ;;
  esac
else
  log "AGENTPATCH_AUTO_SEED!=1 -- skipping seed."
fi

# 3. Migrations. Optional because main.py's create_all is the schema
# safety net for the demo. Trigger via RUN_ALEMBIC=1 if you want real
# Alembic semantics (e.g. when you add new migrations later).
if [ "${RUN_ALEMBIC:-0}" = "1" ]; then
  log "Running Alembic migrations..."
  alembic upgrade head || log "Alembic failed; relying on create_all safety net."
fi

# 4. Start uvicorn. PORT honors Render's $PORT env (defaults to 8000 for
# direct docker use). --workers 1 because the seed demo is tiny and 1
# worker is fastest to cold-start. --proxy-headers + --forwarded-allow-ips
# so X-Forwarded-* from Render's reverse proxy is honored (lets
# request.client.host look like the real client IP, useful if you ever
# add rate-limiting).
log "Starting uvicorn on :${PORT:-8000}..."
exec uvicorn app.main:app \
  --host 0.0.0.0 \
  --port "${PORT:-8000}" \
  --proxy-headers \
  --forwarded-allow-ips="*" \
  --workers 1
