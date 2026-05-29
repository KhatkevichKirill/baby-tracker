# Baby Tracker

Self-hosted семейный дневник ребенка с вводом через Telegram и Web, хранением событий, черновиками LLM и аналитикой.

## Monorepo Layout

- `apps/api` — NestJS API + Prisma
- `apps/web` — веб-интерфейс (scaffold, Node HTTP server)
- `apps/bot` — Telegraf bot
- `apps/worker` — фоновые задачи (LLM, отчеты)
- `packages/shared` — общие типы и zod-схемы
- `packages/config` — общие env-схемы
- `infrastructure` — compose, reverse-proxy, deploy артефакты

## Prerequisites

- Node.js 22+
- [pnpm](https://pnpm.io/) 10+ (`corepack enable`)
- Docker with Compose (`docker compose` or `docker-compose`)

## Quick Start (local)

```bash
cd baby-tracker
cp .env.example .env   # отредактируйте секреты локально; .env не коммитится

# PostgreSQL
docker compose -f infrastructure/docker/docker-compose.yml up -d postgres
# или: docker-compose -f infrastructure/docker/docker-compose.yml up -d postgres

pnpm install
pnpm db:generate
pnpm db:migrate        # нужен запущенный Postgres
pnpm build
pnpm dev               # api :3001, web :3000, bot/worker — по env
```

Проверка compose-манифеста (без запуска сервисов):

```bash
pnpm compose:config
```

## Quick Start (Docker dev stack)

```bash
cp .env.example .env   # опционально для локальных override
docker compose -f infrastructure/docker/docker-compose.yml up -d
# API/worker получают DATABASE_URL на postgres из compose
```

## Scripts (root)

| Script | Description |
|--------|-------------|
| `pnpm dev` | Все пакеты в watch/dev режиме |
| `pnpm build` | `db:generate` + топологическая сборка workspace |
| `pnpm test` | Заглушки тестов в пакетах |
| `pnpm lint` | Заглушки lint в пакетах |
| `pnpm db:generate` | Prisma client |
| `pnpm db:migrate` | Prisma migrate dev |
| `pnpm compose:config` | Валидация docker-compose.yml |

## Workspace imports

Приложения подключают shared-пакеты через `workspace:*`, например:

```ts
import { draftEventSchema } from "@baby-tracker/shared";
```

Перед сборкой apps нужна сборка `packages/shared` (root `pnpm build` делает это через `--sort`).

## Security Baseline

- Только закрытая регистрация по setup token
- Family-scoped authorization
- Telegram account linking через одноразовый код
- Backup PostgreSQL и uploads
- Секреты только в `.env` (см. `.env.example`), не в git

## Agent Handoff

Готовые задачи для реализации по агентам лежат в `docs/agent-tasks/`.

Рекомендуемый порядок:

1. `agent-01-bootstrap.md`
2. `agent-02-domain-model.md`
3. `agent-03-backend-api.md`
4. `agent-04-telegram-bot.md` и `agent-06-web-frontend.md` параллельно
5. `agent-05-llm-parser.md`
6. `agent-07-analytics-reports.md`
7. `agent-08-files-medical-docs.md`
8. `agent-09-devops-vps.md`
9. `agent-10-security-qa-reviewer.md` на каждый крупный блок
