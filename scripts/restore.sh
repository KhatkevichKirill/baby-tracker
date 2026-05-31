#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SQL_DUMP="${1:?Usage: scripts/restore.sh <postgres_dump.sql> [uploads_archive.tar.gz]}"
UPLOADS_ARCHIVE="${2:-}"
COMPOSE_FILE="${COMPOSE_FILE:-${ROOT_DIR}/infrastructure/docker/docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-${ROOT_DIR}/.env}"

if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  COMPOSE=(docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE")
else
  COMPOSE=(docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE")
fi

if [[ ! -f "$SQL_DUMP" ]]; then
  echo "SQL dump not found: $SQL_DUMP"
  exit 1
fi

if [[ -n "$UPLOADS_ARCHIVE" && ! -f "$UPLOADS_ARCHIVE" ]]; then
  echo "Uploads archive not found: $UPLOADS_ARCHIVE"
  exit 1
fi

POSTGRES_USER="${POSTGRES_USER:-baby}"
POSTGRES_DB="${POSTGRES_DB:-baby_tracker}"

echo "Stopping writers (api, web, worker, caddy)..."
"${COMPOSE[@]}" stop api web worker caddy 2>/dev/null || true

if ! [[ -z "$("${COMPOSE[@]}" ps -q postgres 2>/dev/null || true)" ]]; then
  echo "Starting postgres..."
  "${COMPOSE[@]}" up -d postgres
  sleep 3
fi

echo "Recreating database ${POSTGRES_DB}..."
"${COMPOSE[@]}" exec -T postgres psql -U "$POSTGRES_USER" -d postgres <<SQL
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = '${POSTGRES_DB}' AND pid <> pg_backend_pid();
DROP DATABASE IF EXISTS ${POSTGRES_DB};
CREATE DATABASE ${POSTGRES_DB} OWNER ${POSTGRES_USER};
SQL

echo "Restoring PostgreSQL dump..."
"${COMPOSE[@]}" exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" < "$SQL_DUMP"

if [[ -n "$UPLOADS_ARCHIVE" ]]; then
  echo "Ensuring API container is up for uploads restore..."
  "${COMPOSE[@]}" up -d api
  sleep 2
  echo "Restoring uploads archive..."
  cat "$UPLOADS_ARCHIVE" | "${COMPOSE[@]}" exec -T api sh -c 'rm -rf /data/uploads && mkdir -p /data && tar -xzf - -C /data'
fi

echo "Starting application services..."
"${COMPOSE[@]}" up -d

echo "Restore completed. Run scripts/verify-restore.sh to validate."
