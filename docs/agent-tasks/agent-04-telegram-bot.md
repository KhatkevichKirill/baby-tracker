# Agent 04: Telegram Bot

## Prompt

Ты работаешь в `/root/baby-tracker`. Твоя задача: реализовать Telegram ввод для семейного дневника.

## Context

Прочитай:
- `apps/bot/src/index.ts`
- `apps/api/src/modules/telegram.module.ts`
- `tests/api-contract.md`
- `packages/shared/src/events.ts`

## Scope

- Реализовать account linking через одноразовый код.
- Реализовать команды и inline buttons:
  - `/feed`
  - `/sleep_start`
  - `/sleep_end`
  - `/diaper`
  - `/temp`
  - `/note`
- Для свободного текста отправлять raw input в backend.
- Для LLM drafts показывать summary и кнопки:
  - `Сохранить`
  - `Исправить`
  - `Отменить`
- Все final events должны идти через API, не напрямую в DB.

## Acceptance Criteria

- Непривязанный Telegram user не может писать данные.
- Привязанный user может создать feeding/sleep/diaper/symptom/note.
- Свободный текст не создает final event без подтверждения.
- Все события имеют `source = telegram`.
- Webhook setup документирован.

## Return Format

Верни: команды бота, callback actions, проверочные сценарии, ограничения.
