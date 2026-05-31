#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${1:-${ROOT_DIR}/backups}"
COMPOSE_FILE="${COMPOSE_FILE:-${ROOT_DIR}/infrastructure/docker/docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-${ROOT_DIR}/.env}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"

if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  COMPOSE=(docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE")
else
  COMPOSE=(docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE")
fi

mkdir -p "$BACKUP_DIR"

if [[ -z "$("${COMPOSE[@]}" ps -q postgres 2>/dev/null || true)" ]]; then
  echo "Postgres service is not running. Start the stack first:"
  echo "  docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE up -d postgres"
  exit 1
fi

POSTGRES_USER="${POSTGRES_USER:-baby}"
POSTGRES_DB="${POSTGRES_DB:-baby_tracker}"
SQL_FILE="${BACKUP_DIR}/postgres_${TIMESTAMP}.sql"
UPLOADS_FILE="${BACKUP_DIR}/uploads_${TIMESTAMP}.tar.gz"
MANIFEST="${BACKUP_DIR}/manifest_${TIMESTAMP}.json"

echo "Creating PostgreSQL dump..."
"${COMPOSE[@]}" exec -T postgres \
  pg_dump -U "$POSTGRES_USER" --no-owner --no-acl "$POSTGRES_DB" > "$SQL_FILE"

if [[ -n "$("${COMPOSE[@]}" ps -q api 2>/dev/null || true)" ]]; then
  if "${COMPOSE[@]}" exec -T api sh -c 'test -d /data/uploads'; then
    echo "Archiving uploads volume..."
    "${COMPOSE[@]}" exec -T api tar -czf - -C /data uploads > "$UPLOADS_FILE"
  else
    echo "Uploads directory not found in API container; skipping uploads archive."
    UPLOADS_FILE=""
  fi
elif [[ -d "${ROOT_DIR}/uploads" ]]; then
  echo "Archiving local uploads directory..."
  tar -czf "$UPLOADS_FILE" -C "$ROOT_DIR" uploads
else
  echo "No uploads archive created (API not running and ./uploads missing)."
  UPLOADS_FILE=""
fi

cat > "$MANIFEST" <<EOF
{
  "timestamp": "${TIMESTAMP}",
  "postgres_dump": "$(basename "$SQL_FILE")",
  "uploads_archive": $(if [[ -n "$UPLOADS_FILE" ]]; then echo "\"$(basename "$UPLOADS_FILE")\""; else echo "null"; fi),
  "compose_file": "${COMPOSE_FILE}",
  "postgres_user": "${POSTGRES_USER}",
  "postgres_db": "${POSTGRES_DB}"
}
EOF

echo "Backup completed:"
echo "  SQL:       $SQL_FILE"
if [[ -n "$UPLOADS_FILE" ]]; then
  echo "  Uploads:   $UPLOADS_FILE"
fi
echo "  Manifest:  $MANIFEST"
