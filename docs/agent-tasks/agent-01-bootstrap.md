# Agent 01: Architect / Repo Bootstrap

## Prompt

Ты работаешь в `/root/baby-tracker`. Твоя задача: довести monorepo skeleton до надежного состояния для остальных агентов.

## Context

Прочитай:
- `README.md`
- `docs/adr/0001-architecture-foundation.md`
- `package.json`
- `pnpm-workspace.yaml`
- `infrastructure/docker/docker-compose.yml`

## Scope

- Проверить и исправить monorepo layout:
  - `apps/api`
  - `apps/web`
  - `apps/bot`
  - `apps/worker`
  - `packages/shared`
  - `packages/config`
- Настроить единые scripts: `dev`, `build`, `test`, `lint`, `db:generate`, `db:migrate`.
- Убедиться, что shared packages могут импортироваться из apps.
- Добавить или исправить базовые Dockerfiles, если compose не может запускать сервисы воспроизводимо.
- Не реализовывать бизнес-логику сверх scaffold.

## Acceptance Criteria

- `pnpm install` проходит.
- `pnpm build` проходит или документированы конкретные блокеры.
- `docker compose -f infrastructure/docker/docker-compose.yml config` проходит.
- `README.md` содержит актуальный local quick start.
- Секреты не попадают в репозиторий.

## Return Format

Верни краткий отчет: файлы, команды проверки, остаточные риски.
