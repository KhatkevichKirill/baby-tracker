#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${1:-./backups}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

docker exec "$(docker ps --filter name=postgres --format '{{.ID}}' | head -n 1)" \
  pg_dump -U baby baby_tracker > "$BACKUP_DIR/postgres_${TIMESTAMP}.sql"

if [[ -d "./uploads" ]]; then
  tar -czf "$BACKUP_DIR/uploads_${TIMESTAMP}.tar.gz" ./uploads
fi

echo "Backup completed: $BACKUP_DIR"
