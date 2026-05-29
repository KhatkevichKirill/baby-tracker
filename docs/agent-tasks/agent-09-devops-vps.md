# Agent 09: DevOps / VPS Deployment

## Prompt

Ты работаешь в `/root/baby-tracker`. Твоя задача: подготовить воспроизводимый VPS deployment.

## Context

Прочитай:
- `infrastructure/docker/docker-compose.yml`
- `infrastructure/caddy/Caddyfile`
- `infrastructure/docker/DEPLOYMENT.md`
- `.env.example`
- `scripts/backup.sh`

## Scope

- Добавить production-ready Dockerfiles для API/Web/Bot/Worker.
- Разделить local compose и production compose, если нужно.
- Настроить Caddy для домена и HTTPS.
- Подготовить env template без секретов.
- Улучшить backup/restore scripts:
  - PostgreSQL dump;
  - uploads archive;
  - restore command;
  - проверка восстановления.
- Документировать Telegram webhook setup.

## Acceptance Criteria

- Fresh VPS deploy воспроизводим по инструкции.
- `docker compose config` проходит.
- HTTPS reverse proxy описан.
- Backup можно восстановить на чистую базу.
- Секреты не попадают в repo.

## Return Format

Верни: deploy steps, commands, rollback/restore path, known ops risks.
