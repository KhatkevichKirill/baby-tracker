# Agent 02: Database And Domain Model

## Prompt

Ты работаешь в `/root/baby-tracker`. Твоя задача: довести Prisma data model и domain layer для семейного дневника ребенка.

## Context

Прочитай:
- `apps/api/prisma/schema.prisma`
- `packages/shared/src/events.ts`
- `tests/api-contract.md`
- `docs/adr/0001-architecture-foundation.md`

## Scope

- Проверить модели: `Family`, `User`, `Caregiver`, `Child`, `Event`, `RawInput`, `DraftEvent`, `EventAttachment`.
- Проверить subtype models: feeding, sleep, diaper, symptom, measurement.
- Добавить недостающие индексы:
  - `Event(childId, occurredAt)`
  - `Event(familyId, occurredAt)`
  - `DraftEvent(rawInputId)`
  - `RawInput(childId, createdAt)`
- Добавить audit-friendly поля, если нужны для редактирования и удаления.
- Реализовать service/repository слой для событий в API, вместо in-memory массивов.
- Seed должен создавать demo family/user/child.

## Acceptance Criteria

- Prisma schema валидируется.
- Миграция создается и применяется локально.
- CRUD событий работает через repository/service слой.
- Timeline сортируется по `occurredAt`.
- Event сохраняет связь с `RawInput` или `DraftEvent`, когда источник создан из LLM.

## Return Format

Верни: измененные модели, команды миграции, проверенные сценарии, риски миграций.
