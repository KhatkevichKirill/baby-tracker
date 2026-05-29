# Agent 06: Web Frontend

## Prompt

Ты работаешь в `/root/baby-tracker`. Твоя задача: реализовать Web MVP для просмотра, редактирования и аналитики дневника.

## Context

Прочитай:
- `apps/web`
- `tests/api-contract.md`
- `packages/shared/src/events.ts`
- `README.md`

## Scope

- Заменить placeholder web server на Next.js app или довести выбранный web stack до согласованного состояния.
- Реализовать экраны:
  - login/session;
  - today dashboard;
  - timeline;
  - add/edit event forms;
  - draft review;
  - child profile;
  - analytics overview.
- Формы должны использовать shared schemas или совместимые DTO.
- UI должен явно разделять final events и drafts.

## Acceptance Criteria

- Все MVP event types можно создать/отредактировать через Web.
- Timeline фильтруется по дате и типу.
- Draft можно подтвердить/отклонить.
- Ошибки API показываются пользователю в понятном виде.
- Нет медицинских советов, только факты и наблюдения.

## Return Format

Верни: реализованные routes/screens, API dependencies, manual test plan, UI gaps.
