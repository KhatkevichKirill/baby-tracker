#!/usr/bin/env bash
set -euo pipefail

SQL_DUMP="${1:?Usage: scripts/restore.sh <postgres_dump.sql> [uploads_archive.tar.gz]}"
UPLOADS_ARCHIVE="${2:-}"
POSTGRES_CONTAINER="$(docker ps --filter name=postgres --format '{{.ID}}' | head -n 1)"

if [[ -z "$POSTGRES_CONTAINER" ]]; then
  echo "Postgres container not found"
  exit 1
fi

docker exec -i "$POSTGRES_CONTAINER" psql -U baby -d baby_tracker < "$SQL_DUMP"

if [[ -n "$UPLOADS_ARCHIVE" ]]; then
  tar -xzf "$UPLOADS_ARCHIVE" -C .
fi

echo "Restore completed"
