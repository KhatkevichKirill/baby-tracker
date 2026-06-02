#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-${ROOT_DIR}/infrastructure/docker/docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-${ROOT_DIR}/.env}"
DOMAIN="${DOMAIN:-}"

if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  COMPOSE=(docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE")
else
  COMPOSE=(docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE")
fi

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  set -a
  source "$ENV_FILE"
  set +a
fi

echo "Checking API health via container..."

attempt=0
max_attempts=30
until "${COMPOSE[@]}" exec -T api node -e \
  "require('http').get('http://127.0.0.1:3001/health',(r)=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>{process.stdout.write(d);process.exit(r.statusCode===200?0:1);});}).on('error',()=>process.exit(1));" \
  >/tmp/baby-tracker-health.json 2>/dev/null; do
  attempt=$((attempt + 1))
  if [[ "$attempt" -ge "$max_attempts" ]]; then
    echo "Health check failed after ${max_attempts} attempts."
    exit 1
  fi
  sleep 2
done

if [[ -n "$DOMAIN" ]]; then
  echo "Checking public HTTPS route https://${DOMAIN}/api/health..."
  if curl -fsS "https://${DOMAIN}/api/health" >/tmp/baby-tracker-public-health.json 2>/dev/null; then
    cat /tmp/baby-tracker-public-health.json
    echo
  else
    echo "Warning: public HTTPS health check failed (DNS/TLS/Caddy may still be propagating)."
  fi
fi

if ! grep -q '"ok"[[:space:]]*:[[:space:]]*true' /tmp/baby-tracker-health.json; then
  echo "Health endpoint responded but database may be down:"
  cat /tmp/baby-tracker-health.json
  exit 1
fi

echo "API health OK:"
cat /tmp/baby-tracker-health.json
echo

POSTGRES_USER="${POSTGRES_USER:-baby}"
POSTGRES_DB="${POSTGRES_DB:-baby_tracker}"

TABLE_COUNT="$("${COMPOSE[@]}" exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc \
  "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';")"

echo "Public tables in ${POSTGRES_DB}: ${TABLE_COUNT}"
if [[ "${TABLE_COUNT}" -eq 0 ]]; then
  echo "Warning: no public tables found — dump may be empty or migration missing."
  exit 1
fi

if [[ -n "$("${COMPOSE[@]}" ps -q api 2>/dev/null || true)" ]]; then
  UPLOAD_COUNT="$("${COMPOSE[@]}" exec -T api sh -c 'find /data/uploads -type f 2>/dev/null | wc -l' | tr -d '[:space:]')"
  echo "Upload files in API volume: ${UPLOAD_COUNT}"
fi

echo "Restore verification passed."
