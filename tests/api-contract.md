# API Contract

All protected endpoints require:

```http
Authorization: Bearer <jwt>
```

## Error format

```json
{
  "error": {
    "statusCode": 403,
    "code": "FORBIDDEN",
    "message": "No access to this family",
    "path": "/events/timeline/...",
    "timestamp": "2026-05-29T12:00:00.000Z"
  }
}
```

## Auth

- `POST /auth/setup` (public) — first admin bootstrap, requires `setupToken`
- `POST /auth/login` (public) — returns JWT + user + families
- `GET /auth/me` — current session profile

### Login response

```json
{
  "token": "<jwt>",
  "user": { "id": "...", "email": "...", "displayName": "..." },
  "families": [{ "id": "...", "name": "...", "role": "admin" }]
}
```

## Health

- `GET /health` (public) — `{ ok, service, database }`

## Child

- `POST /children` — body: `{ name, dateOfBirth, sexAtBirth? }` (family derived from auth)
- `GET /children/:id`

## Events

- `POST /events` — body: `{ childId, type, occurredAt, source, note?, details?, rawInputId? }`
- `GET /events/timeline/:childId?type=<event_type>` — sorted by `occurredAt` desc
- `GET /events/:id`
- `PATCH /events/:id`
- `DELETE /events/:id`

Structured event types (`feeding`, `sleep`, `diaper`, `symptom`, `measurement`) create subtype rows on `POST /events`.

## Raw Inputs

- `POST /raw-inputs` — body: `{ childId, source, text, telegramChatId? }`
- `GET /raw-inputs/:id`

## Drafts

- `POST /drafts` — body: `{ childId, rawInputId, type, occurredAt?, details, confidence, sourceFragment }`
- `GET /drafts/:id`
- `PATCH /drafts/:id/confirm` — creates final event only after confirmation

## Analytics

- `GET /analytics/daily/:childId`
- `GET /analytics/weekly/:childId`

## Files

- `POST /files` — attachment metadata
- `GET /files/:id`

## Telegram

- `POST /telegram/webhook` (public)

## Export

- `GET /export/json/:childId` — family-scoped JSON export payload
