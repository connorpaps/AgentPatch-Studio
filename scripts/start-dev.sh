#!/usr/bin/env bash
# scripts/start-dev.sh
# One-command Postgres-first dev launcher for AgentPatch Studio.
# Brings up Postgres + Redis + MinIO via docker compose, waits for
# Postgres to be ready, runs the seed script, then optionally starts
# uvicorn + next dev as background processes.
#
# Usage:
#   ./scripts/start-dev.sh             # full stack + servers
#   ./scripts/start-dev.sh --servers   # alias for default
#   ./scripts/start-dev.sh --no-uvicorn
#   ./scripts/start-dev.sh --no-next
#
# Recognised env:
#   DATABASE_URL                 -- already in apps/api/.env (postgresql://...:5433/...)
#   COMPOSE_PROJECT_NAME         -- defaults to "agentpatch"
#   LOG_DIR                      -- defaults to $ROOT/logs with /tmp fallback

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_PROJECT="${COMPOSE_PROJECT_NAME:-agentpatch}"
SERVE_UVICORN=1
SERVE_NEXT=1

# Pick a writable log directory using a concrete touch+rm test
# (bash `[[ -w ]]` lies on Windows Git Bash where perms are weird).
LOG_DIR_DEFAULT="$ROOT/logs"
LOG_DIR="${LOG_DIR:-}"
if [[ -z "$LOG_DIR" ]]; then
  for candidate in "$ROOT/logs" "/tmp"; do
    mkdir -p "$candidate" 2>/dev/null || continue
    if touch "$candidate/.agentpatch-write-test" 2>/dev/null \
       && rm -f "$candidate/.agentpatch-write-test" 2>/dev/null; then
      LOG_DIR="$candidate"
      break
    fi
  done
fi
if [[ -z "$LOG_DIR" ]]; then
  echo "no writable log directory; set LOG_DIR=..." >&2
  exit 1
fi

for arg in "$@"; do
  case "$arg" in
    --no-uvicorn) SERVE_UVICORN=0 ;;
    --no-next)     SERVE_NEXT=0 ;;
    --servers)     SERVE_UVICORN=1; SERVE_NEXT=1 ;;
    -h|--help)
      sed -n '2,18p' "$0"
      exit 0
      ;;
    *) echo "unknown arg: $arg" >&2; exit 1 ;;
  esac
done

say() { printf "\033[1;34m[start-dev]\033[0m %s\n" "$*"; }

cd "$ROOT"

# 1. Bring up Postgres + Redis + MinIO
say "Bringing up Postgres + Redis + MinIO via docker compose…"
COMPOSE_PROJECT_NAME="$COMPOSE_PROJECT" docker compose up -d postgres redis minio

# 2. Wait up to 120s for Postgres to be ready via docker exec pg_isready
# (portable on Windows Git Bash vs guessing the container name).
say "Waiting for Postgres @ localhost:5433 to be ready…"
ready=0
for i in $(seq 1 120); do
  if COMPOSE_PROJECT_NAME="$COMPOSE_PROJECT" docker compose exec -T postgres \
        pg_isready -U postgres -d agentpatch >/dev/null 2>&1; then
    say "Postgres is ready after ${i}s."
    ready=1
    break
  fi
  if [[ $i -eq 120 ]]; then
    echo "Postgres did not become ready within 120s. Tailing logs:" >&2
    COMPOSE_PROJECT_NAME="$COMPOSE_PROJECT" docker compose logs postgres | tail -60 >&2 || true
    exit 1
  fi
  sleep 1
done

# 3. Seed the database (drops + recreates all tables)
say "Seeding demo workflows (support-policy, IT-incident, compliance-review)…"
(
  cd apps/api
  python scripts/seed.py
)
say "Seed complete."

# 4a. Optionally start uvicorn as a background process
if [[ "$SERVE_UVICORN" -eq 1 ]]; then
  say "Starting uvicorn on :8000 (logs → $LOG_DIR/api.log)…"
  (
    cd apps/api
    nohup uvicorn app.main:app --host 0.0.0.0 --port 8000 > "$LOG_DIR/api.log" 2>&1 &
    echo $! > "$ROOT/api.pid"
  )
fi

# 4b. Optionally start next dev
if [[ "$SERVE_NEXT" -eq 1 ]]; then
  say "Starting next dev on :3000 (logs → $LOG_DIR/web.log)…"
  (
    cd apps/web
    nohup npx next dev -p 3000 > "$LOG_DIR/web.log" 2>&1 &
    echo $! > "$ROOT/web.pid"
  )
fi

# 5. Wait for uvicorn to be ready AND a demo-cookie round-trip to succeed.
# Health alone is insufficient — it returns 200 even on an empty DB (just
# runs SELECT 1). The cookie probe catches a broken seed so we don't say
# "Done" while /auth/demo would 500.
if [[ "$SERVE_UVICORN" -eq 1 ]]; then
  say "Waiting for uvicorn on :8000…"
  ready=0
  for i in $(seq 1 30); do
    if curl -fs http://localhost:8000/api/v1/health >/dev/null 2>&1; then
      ready=1
      break
    fi
    [[ $i -eq 30 ]] && echo "uvicorn never started serving on :8000. Tail of $LOG_DIR/api.log:" >&2 \
                       && tail -40 "$LOG_DIR/api.log" >&2 && exit 1
    sleep 1
  done
  say "uvicorn is serving."

  say "Probing /api/v1/auth/demo + /api/v1/auth/me (half-broken-state guard)…"
  rm -f "$ROOT/.demo-smoke.cookies"
  trap 'rm -f "$ROOT/.demo-smoke.cookies"' RETURN EXIT
  # POST is cheap (token mint only); GETs touch full route handlers and
  # could be slow on the first cold path.
  if curl -fs --max-time 5 -c "$ROOT/.demo-smoke.cookies" -X POST \
        http://localhost:8000/api/v1/auth/demo \
        -H 'Content-Type: application/json' -d '{}' >/dev/null; then
    if curl -fs --max-time 10 -b "$ROOT/.demo-smoke.cookies" \
         http://localhost:8000/api/v1/auth/me \
         | grep -q '"principal"'; then
      # Also catch "seed ran partially" (e.g. only Project table populated).
      runs_body=$(curl -fs --max-time 10 -b "$ROOT/.demo-smoke.cookies" \
                     'http://localhost:8000/api/v1/runs?limit=1' || true)
      if [[ -n "$runs_body" && "$runs_body" == *'"id"'* ]]; then
        say "Demo cookie flow round-trips AND seeded runs are queryable. Postgres-backed API is healthy end-to-end."
      else
        echo "/api/v1/runs returned no runs; seed may have populated only the Project row." >&2
        tail -40 "$LOG_DIR/api.log" >&2 || true
        exit 1
      fi
    else
      echo "/api/v1/auth/me response did not contain 'principal'; seed may have failed." >&2
      tail -40 "$LOG_DIR/api.log" >&2 || true
      exit 1
    fi
  else
    echo "/api/v1/auth/demo did not return 200; seed may have failed." >&2
    tail -40 "$LOG_DIR/api.log" >&2 || true
    exit 1
  fi
  rm -f "$ROOT/.demo-smoke.cookies"
fi

say "Done. Postgres-backed API is healthy end-to-end."
say "First-time walkthrough:"
say "  1.  curl http://localhost:8000/api/v1/health                          ← Postgres + Redis status"
say "  2.  curl -X POST http://localhost:8000/api/v1/auth/demo -H 'Content-Type: application/json' -d '{}' -c dc.cookies"
say "     curl -b dc.cookies http://localhost:8000/api/v1/auth/me"
say "     curl -b dc.cookies 'http://localhost:8000/api/v1/runs?limit=3'   ← see seeded workflows"
say "  3.  open  http://localhost:3000/demo                                 ← Next.js demo workspace"
