# Agent 05: LLM Parsing

## Prompt

Ты работаешь в `/root/baby-tracker`. Твоя задача: реализовать подтверждаемый LLM parsing flow для русскоязычных сообщений.

## Context

Прочитай:
- `apps/worker/src/index.ts`
- `apps/worker/src/llm/provider.ts`
- `apps/worker/src/templates/parse-ru.template.ts`
- `apps/worker/tests/parser-cases.md`
- `packages/shared/src/events.ts`
- `apps/api/prisma/schema.prisma`

## Scope

- Реализовать `LlmProvider` abstraction так, чтобы provider можно было заменить.
- Добавить strict JSON parsing и zod validation.
- Поддержать типы: feeding, sleep, diaper, symptom, measurement, note.
- Хранить:
  - confidence;
  - sourceFragment;
  - raw input id;
  - ambiguity/fallback reason.
- При ошибке LLM или невалидном JSON создавать fallback draft/note, а не final event.
- Не давать медицинских рекомендаций.

## Acceptance Criteria

- Parser не создает final events напрямую.
- В тестах есть несколько событий из одного сообщения.
- Невалидный JSON и пустой ответ не ломают flow.
- Низкая уверенность требует подтверждения или уточнения.
- Prompt на русском и явно запрещает диагнозы/советы.

## Return Format

Верни: provider interface, parser behavior, тест-кейсы, известные ограничения.
