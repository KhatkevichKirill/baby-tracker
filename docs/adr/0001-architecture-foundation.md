# ADR-0001: Baby Tracker Foundation

## Status
Accepted

## Context
Нужен self-hosted семейный дневник грудного ребенка с вводом через Telegram и Web, последующей аналитикой и безопасным хранением чувствительных данных.

## Decision
- Monorepo на TypeScript (`pnpm workspaces`)
- Backend API: NestJS + Prisma + PostgreSQL
- Bot: Telegraf
- Web: Next.js
- Shared schemas: `zod` в `packages/shared`
- LLM ввод: только в виде `DraftEvent` с обязательным подтверждением
- Деплой: Docker Compose на VPS c Caddy

## Consequences
- Единый язык упрощает типизацию и обмен DTO между слоями.
- Для MVP покрываем только одну семью и одного ребенка, но с моделью, которую легко расширить.
- Без подтверждения LLM-записи финальные события не создаются.
