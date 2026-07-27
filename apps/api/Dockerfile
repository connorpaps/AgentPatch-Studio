FROM python:3.11-slim

WORKDIR /app

# Install system deps: gcc + libpq-dev for psycopg2-binary build fallback,
# curl for the readiness probe fallback in start.sh.
RUN apt-get update && apt-get install -y --no-install-recommends \
        gcc \
        libpq-dev \
        curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Production entrypoint: waits for DB, optionally idempotently seeds, then
# exec uvicorn so SIGTERM reaches it for Render's graceful shutdown.
RUN chmod +x /app/start.sh

EXPOSE 8000

CMD ["/app/start.sh"]
