# Agent 08: Files, Doctor Visits, Lab Results

## Prompt

Ты работаешь в `/root/baby-tracker`. Твоя задача: поддержать документы, врачебные осмотры и результаты анализов.

## Context

Прочитай:
- `apps/api/src/modules/file.module.ts`
- `apps/api/prisma/schema.prisma`
- `packages/shared/src/events.ts`
- `docs/security-checklist.md`

## Scope

- Upload endpoint с ограничениями size/mime.
- Attachment service.
- Doctor visit event details.
- Lab result event details.
- File preview/download с authorization.
- Удаление/обновление событий с корректной обработкой вложений.

## Acceptance Criteria

- Файл всегда связан с `familyId`, `childId`, `eventId`.
- Файл нельзя скачать без доступа к family.
- Есть лимиты на типы и размер.
- Удаление события не оставляет orphan attachments без явной политики.
- Реальные медицинские данные не попадают в tests/fixtures.

## Return Format

Верни: storage strategy, endpoints, security checks, cleanup behavior.
