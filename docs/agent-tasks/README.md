# Agent Task Pack

Этот каталог содержит готовые инструкции для агентов. Каждую задачу можно выдавать отдельному агенту как самостоятельный prompt.

## Общие правила для всех агентов

- Не менять файл плана в `.cursor/plans`.
- Работать только внутри `/root/baby-tracker`.
- Перед изменениями читать `README.md`, `docs/adr/0001-architecture-foundation.md`, `tests/api-contract.md` и релевантные файлы своего модуля.
- Не коммитить секреты, `.env`, токены, дампы базы, реальные медицинские данные.
- Использовать существующие пакеты и стиль проекта.
- После изменений обновлять документацию только если изменилась команда запуска, API contract или deploy flow.
- В конце вернуть:
  - список измененных файлов;
  - что реализовано;
  - как проверено;
  - какие риски/долги остались.

## Порядок выдачи задач

1. `agent-01-bootstrap.md`
2. `agent-02-domain-model.md`
3. `agent-03-backend-api.md`
4. `agent-04-telegram-bot.md` и `agent-06-web-frontend.md` можно запускать параллельно после API contracts.
5. `agent-05-llm-parser.md` после стабилизации `RawInput` и `DraftEvent`.
6. `agent-07-analytics-reports.md`
7. `agent-08-files-medical-docs.md`
8. `agent-09-devops-vps.md`
9. `agent-10-security-qa-reviewer.md` должен ревьюить каждый крупный блок.

## Definition of Done для MVP

- Родитель добавляет feeding/sleep/diaper/temp/note из Telegram.
- В Web видно день, timeline, редактирование и базовая аналитика.
- Свободный текст создает только `DraftEvent`; финальный `Event` появляется после подтверждения.
- Данные хранятся в PostgreSQL.
- Есть backup/restore инструкция.
- Family-level access control проверен тестами.
