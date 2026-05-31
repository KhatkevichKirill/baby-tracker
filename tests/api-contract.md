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

Allowed mime types: `application/pdf`, `image/jpeg`, `image/png`, `image/webp`, `text/plain`.
Max size: 10 MiB per file.

- `POST /files/upload` — multipart form: `eventId` (uuid), `file` (binary). Creates attachment linked to `familyId`, `childId`, `eventId`.
- `GET /files/:id` — attachment metadata (family-scoped)
- `GET /files/:id/download` — download with `Content-Disposition: attachment`
- `GET /files/:id/preview` — inline preview for pdf/images/text only
- `DELETE /files/:id` — delete attachment record and stored file

### Doctor visit / lab result events

`doctor_visit` and `lab_result` store structured details in `detailsJson` (no subtype table).

Doctor visit `details` example:

```json
{
  "providerName": "Dr. Example",
  "facility": "City Clinic",
  "visitType": "routine",
  "reason": "Wellness check",
  "attachmentIds": ["..."]
}
```

Lab result `details` example:

```json
{
  "testName": "Complete blood count",
  "labName": "Example Lab",
  "values": [{ "name": "Hemoglobin", "value": "12.1", "unit": "g/dL", "flag": "normal" }],
  "attachmentIds": ["..."]
}
```

Event deletion purges linked attachment rows and stored files after the delete transaction commits. If attachment cleanup fails, the event remains deleted and the response includes `attachmentCleanup: { status: "failed", retryable: true }`.

## Telegram

- `POST /telegram/link-tokens` — body: `{ childId }` — create one-time link code (15 min TTL)
- `POST /telegram/link` (public) — body: `{ code, telegramUserId, telegramChatId? }` — redeem code, returns JWT session + `childId`
- `GET /telegram/context` (public) — headers: `X-Bot-Secret`, `X-Telegram-User-Id` — restore bot session for linked user
- `POST /telegram/webhook` (public) — Telegram update payload; requires header `X-Telegram-Bot-Api-Secret-Token` matching `TELEGRAM_WEBHOOK_SECRET` or `TELEGRAM_BOT_SECRET`

See `apps/bot/README.md` for webhook setup.

## Export

- `GET /export/json/:childId` — family-scoped JSON export payload
