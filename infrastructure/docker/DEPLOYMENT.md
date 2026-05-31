# VPS Deployment

Reproducible production deploy for Baby Tracker on a single VPS with Docker Compose, Caddy (HTTPS), PostgreSQL, and volume backups.

## Prerequisites

- Ubuntu/Debian VPS (2 GB+ RAM recommended)
- Docker Engine 24+ and Docker Compose v2
- Domain `A`/`AAAA` record pointing to the VPS public IP
- Telegram bot token from [@BotFather](https://t.me/BotFather)

## File layout

| File | Purpose |
|------|---------|
| `infrastructure/docker/docker-compose.yml` | Local dev stack (bind mounts, hot reload) |
| `infrastructure/docker/docker-compose.prod.yml` | Production images + volumes |
| `infrastructure/caddy/Caddyfile` | Local HTTP reverse proxy |
| `infrastructure/caddy/Caddyfile.prod` | Domain + automatic HTTPS |
| `infrastructure/docker/env.production.example` | Production env template (no secrets) |
| `scripts/backup.sh` | PostgreSQL dump + uploads archive |
| `scripts/restore.sh` | Restore onto clean database |
| `scripts/verify-restore.sh` | Post-restore health check |

## Fresh VPS deploy

### 1. Install Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker "$USER"
# re-login, then:
docker compose version
```

### 2. Clone and configure env

```bash
git clone <repo-url> baby-tracker
cd baby-tracker
cp infrastructure/docker/env.production.example .env
```

Edit `.env` and set at minimum:

- `DOMAIN` — public hostname (e.g. `tracker.example.com`)
- `ACME_EMAIL` — email for Let's Encrypt notices
- `POSTGRES_PASSWORD` — strong random password
- `JWT_SECRET`, `SETUP_TOKEN`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_SECRET` — generate with `openssl rand -hex 32`

Keep `.env` on the server only; never commit it.

### 3. Validate compose manifest

```bash
docker compose -f infrastructure/docker/docker-compose.prod.yml --env-file .env config
# or: pnpm compose:config:prod
```

### 4. Build and start

The Web image is Next.js (`output: "standalone"`). `NEXT_PUBLIC_API_URL` is passed as a **build arg** from `DOMAIN` in compose — set `.env` before building. If you change `DOMAIN` later, rebuild Web: `docker-compose ... up -d --build web`.

```bash
docker-compose -f infrastructure/docker/docker-compose.prod.yml --env-file .env up -d --build
```

The API entrypoint runs `prisma migrate deploy` on start. First boot may take ~1 minute while migrations apply.

### 5. Verify HTTPS reverse proxy

Caddy terminates TLS and routes:

| Public URL | Backend |
|------------|---------|
| `https://<DOMAIN>/` | Web UI (`web:3000`) |
| `https://<DOMAIN>/api/*` | API (`api:3001`, `/api` prefix stripped) |

```bash
curl -fsS "https://<DOMAIN>/api/health"
# {"ok":true,"service":"baby-tracker-api","database":"connected"}
```

### 6. Initial setup token

Use `SETUP_TOKEN` from `.env` for closed registration (see API docs / security checklist).

## Telegram webhook setup

Production uses **webhook mode inside the API** (`TelegramWebhookService`). Do **not** run the `bot` polling container against the same token.

### 1. Required env (API container)

```env
TELEGRAM_BOT_TOKEN=...
TELEGRAM_BOT_SECRET=...          # min 16 chars, shared secret
TELEGRAM_WEBHOOK_SECRET=...      # optional; defaults to TELEGRAM_BOT_SECRET
API_BASE_URL=http://api:3001       # set in compose for internal calls
```

Restart API after changing Telegram env:

```bash
docker compose -f infrastructure/docker/docker-compose.prod.yml --env-file .env up -d api
```

### 2. Register webhook with Telegram

Public webhook URL (Caddy adds `/api` prefix):

```text
https://<DOMAIN>/api/telegram/webhook
```

```bash
curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -H "content-type: application/json" \
  -d "{
    \"url\": \"https://${DOMAIN}/api/telegram/webhook\",
    \"secret_token\": \"${TELEGRAM_WEBHOOK_SECRET:-${TELEGRAM_BOT_SECRET}}\",
    \"allowed_updates\": [\"message\", \"callback_query\"]
  }"
```

Telegram sends header `X-Telegram-Bot-Api-Secret-Token`. Invalid or missing secrets return `401`.

### 3. Verify webhook

```bash
curl "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo"
```

Expect `url` = your domain path and empty `last_error_message`.

### 4. Local development (polling)

For local dev, use `docker-compose.yml` **bot** service or `pnpm --filter @baby-tracker/bot dev`. Never run polling and webhook on the same bot token.

See also `apps/bot/README.md`.

## Backup

```bash
# from repo root, production stack running
scripts/backup.sh ./backups
```

Creates:

- `backups/postgres_YYYYMMDD_HHMMSS.sql` — `pg_dump`
- `backups/uploads_YYYYMMDD_HHMMSS.tar.gz` — files from API volume (if present)
- `backups/manifest_YYYYMMDD_HHMMSS.json` — metadata

Override stack with `COMPOSE_FILE` / `ENV_FILE` env vars.

Schedule example (cron, daily 03:00):

```cron
0 3 * * * cd /opt/baby-tracker && ./scripts/backup.sh /var/backups/baby-tracker
```

Copy backups off-server (S3, rsync, etc.).

## Restore drill (clean database)

Simulates disaster recovery onto empty PostgreSQL.

```bash
# 1. Stop writers automatically inside restore script
scripts/restore.sh ./backups/postgres_YYYYMMDD_HHMMSS.sql ./backups/uploads_YYYYMMDD_HHMMSS.tar.gz

# 2. Validate
scripts/verify-restore.sh
```

Restore drops and recreates the `baby_tracker` database, replays the SQL dump, extracts uploads into the API volume, then starts all services.

For local dev backups (postgres only on host port 5432):

```bash
COMPOSE_FILE=infrastructure/docker/docker-compose.yml ENV_FILE=.env.example scripts/backup.sh ./backups
```

## Rollback

| Scenario | Action |
|----------|--------|
| Bad deploy (app only) | `git checkout <previous-tag>` then `docker compose ... up -d --build` |
| Bad migration | Restore latest SQL backup via `scripts/restore.sh` |
| Config mistake | Fix `.env`, `docker compose ... up -d` |
| TLS / Caddy issue | Check `docker compose logs caddy`, DNS, ports 80/443 open |

There is no automatic blue/green — rollback = redeploy previous image tag or restore backup.

## Known ops risks

- **Single-node**: no HA; plan maintenance window for restores.
- **Secrets in `.env`**: rotate JWT/SETUP/Telegram secrets requires coordinated restart; webhook `secret_token` must match API env.
- **Uploads volume**: not in SQL dump; always backup uploads archive together with Postgres.
- **Webhook vs polling**: running `bot` container in prod with same token breaks Telegram delivery.
- **ACME**: ports 80 and 443 must reach Caddy; Cloudflare "flexible SSL" can break certificate issuance — use "full" or DNS-only during setup.
- **Worker**: placeholder process today; safe to run but does not yet process background jobs.
- **Memory**: `docker compose build` on small VPS may OOM — add swap or build on CI and pull images.

## Useful commands

```bash
# Logs
docker compose -f infrastructure/docker/docker-compose.prod.yml --env-file .env logs -f api caddy

# Shell into postgres
docker compose -f infrastructure/docker/docker-compose.prod.yml --env-file .env exec postgres psql -U baby baby_tracker

# Rebuild one service
docker compose -f infrastructure/docker/docker-compose.prod.yml --env-file .env up -d --build api
```
