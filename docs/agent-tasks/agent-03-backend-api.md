# Agent 03: Backend API

## Prompt

Ты работаешь в `/root/baby-tracker`. Твоя задача: реализовать production-shaped NestJS API поверх Prisma domain model.

## Context

Прочитай:
- `apps/api/src/modules/*`
- `apps/api/prisma/schema.prisma`
- `packages/shared/src/events.ts`
- `tests/api-contract.md`
- `docs/security-checklist.md`

## Scope

- Заменить placeholder/in-memory контроллеры на сервисы с Prisma.
- Реализовать:
  - auth bootstrap/login/session или JWT;
  - child endpoints;
  - event CRUD;
  - timeline/filter endpoints;
  - draft endpoints;
  - stable error format;
  - health endpoint.
- Добавить family-level guard.
- Добавить typed DTOs/validation на основе shared schemas.
- Обновить `tests/api-contract.md`, если фактический contract изменился.

## Acceptance Criteria

- API не отдает/не меняет данные другой family.
- `POST /events` создает событие и subtype row, если тип структурированный.
- `GET /events/timeline/:childId` сортирует по `occurredAt`.
- `PATCH /drafts/:id/confirm` создает final event только после подтверждения.
- Есть unit/integration tests для ключевых сценариев.

## Return Format

Верни: endpoints, тесты, команды проверки, unresolved risks.
