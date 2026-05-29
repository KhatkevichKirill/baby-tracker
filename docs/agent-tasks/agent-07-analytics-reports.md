# Agent 07: Analytics And Reports

## Prompt

Ты работаешь в `/root/baby-tracker`. Твоя задача: реализовать базовую аналитику и отчеты.

## Context

Прочитай:
- `apps/api/src/modules/analytics.module.ts`
- `apps/api/prisma/schema.prisma`
- `packages/shared/src/events.ts`
- `docs/security-checklist.md`

## Scope

- Daily summary:
  - количество кормлений;
  - общий объем/длительность питания;
  - суммарный сон;
  - количество diaper событий;
  - симптомы/температура.
- Weekly trends:
  - сон;
  - питание;
  - вес/температура;
  - diaper frequency.
- Edge cases:
  - sleep crosses midnight;
  - sleep has no end;
  - edited/deleted events;
  - missing optional values.
- Telegram daily summary command через API contract.

## Acceptance Criteria

- Analytics строится только из structured events.
- Нет диагнозов и медицинских советов.
- Aggregation tests покрывают edge cases.
- Web/API формат стабилен и документирован.

## Return Format

Верни: endpoints, formulas, тесты, ограничения интерпретации.
