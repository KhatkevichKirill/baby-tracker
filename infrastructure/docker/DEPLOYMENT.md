# VPS Deployment

## Prerequisites
- VPS with Docker + Docker Compose
- Domain pointing to VPS
- Telegram bot token
- Filled `.env` from `.env.example`

## Steps
1. `git clone <repo> && cd baby-tracker`
2. `cp .env.example .env` and fill production values
3. `docker compose -f infrastructure/docker/docker-compose.yml up -d`
4. Run database migration:
   - `docker compose -f infrastructure/docker/docker-compose.yml exec api pnpm db:migrate`
5. Configure Telegram webhook to `https://<domain>/api/telegram/webhook`

## Restore Drill
1. Stop writers (`api`, `bot`, `worker`)
2. Restore SQL dump into PostgreSQL
3. Restore uploads archive
4. Start services and verify health endpoints

Commands:

```bash
scripts/backup.sh ./backups
scripts/restore.sh ./backups/postgres_YYYYMMDD_HHMMSS.sql ./backups/uploads_YYYYMMDD_HHMMSS.tar.gz
```
