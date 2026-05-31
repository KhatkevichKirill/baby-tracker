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

All analytics responses include:

```json
{
  "disclaimer": "Observational summary from recorded events only. Not medical advice or diagnosis."
}
```

Analytics is built only from confirmed structured events (`deletedAt = null`). Drafts and raw inputs are excluded. Sleep duration uses overlap with the requested day/week window, not only `occurredAt`.

### Daily summary

- `GET /analytics/daily/:childId?date=YYYY-MM-DD&format=json|text`
- `date` defaults to today (UTC day boundary)
- `format=text` returns plain-text summary for Telegram (`Content-Type: text/plain`)

#### Daily JSON response

```json
{
  "childId": "...",
  "date": "2026-05-30",
  "disclaimer": "Observational summary from recorded events only. Not medical advice or diagnosis.",
  "feeding": {
    "count": 5,
    "totalVolumeMl": 420,
    "totalDurationMin": 45,
    "byKind": { "breast": 3, "formula": 2 }
  },
  "sleep": {
    "sessionCount": 3,
    "totalMinutes": 780,
    "ongoingSessions": 1
  },
  "diaper": {
    "count": 6,
    "byKind": { "urine": 4, "stool": 1, "mixed": 1 }
  },
  "symptoms": {
    "count": 1,
    "withTemperature": 1,
    "temperatureReadingsC": [37.4],
    "types": ["cough"]
  },
  "measurements": {
    "count": 1,
    "weightKg": 4.2,
    "temperatureC": null
  }
}
```

Formulas:
- `feeding.totalVolumeMl` / `totalDurationMin` are `null` when no events recorded that field (missing optional values are not treated as zero).
- `sleep.totalMinutes` sums clipped minutes per session: `min(endAt, dayEnd) - max(startAt, dayStart)`; open-ended sleep uses current time as provisional end.
- `symptoms.temperatureReadingsC` lists recorded values only — no thresholds or diagnosis.

### Weekly trends

- `GET /analytics/weekly/:childId?date=YYYY-MM-DD`
- `date` is the last day of the 7-day window (inclusive), default today.

#### Weekly JSON response

```json
{
  "childId": "...",
  "from": "2026-05-24",
  "to": "2026-05-30",
  "disclaimer": "Observational summary from recorded events only. Not medical advice or diagnosis.",
  "days": [
    {
      "date": "2026-05-24",
      "feeding": { "count": 5, "totalVolumeMl": 500, "totalDurationMin": 60 },
      "sleep": { "sessionCount": 2, "totalMinutes": 600 },
      "diaper": { "count": 4 },
      "weightKg": null,
      "temperatureC": 36.6
    }
  ],
  "totals": {
    "feeding": { "count": 35, "totalVolumeMl": 3500, "totalDurationMin": 420, "byKind": {} },
    "sleep": { "sessionCount": 14, "totalMinutes": 4200 },
    "diaper": { "count": 28, "byKind": {} }
  },
  "averages": {
    "feedingCountPerDay": 5,
    "sleepMinutesPerDay": 600,
    "diaperCountPerDay": 4
  },
  "weight": { "startKg": 4.1, "endKg": 4.15, "changeKg": 0.05 },
  "temperature": { "minC": 36.4, "maxC": 37.2, "readingCount": 3 }
}
```

### Telegram `/summary`

Linked bot session calls `GET /analytics/daily/:childId?format=text` with `Authorization: Bearer <session.token>` from `/telegram/link` or `/telegram/context`.

## Files

- `POST /files` — attachment metadata
- `GET /files/:id`

## Telegram

- `POST /telegram/link-tokens` — body: `{ childId }` — create one-time link code (15 min TTL)
- `POST /telegram/link` (public) — body: `{ code, telegramUserId, telegramChatId? }` — redeem code, returns JWT session + `childId`
- `GET /telegram/context` (public) — headers: `X-Bot-Secret`, `X-Telegram-User-Id` — restore bot session for linked user
- `POST /telegram/webhook` (public) — Telegram update payload; requires header `X-Telegram-Bot-Api-Secret-Token` matching `TELEGRAM_WEBHOOK_SECRET` or `TELEGRAM_BOT_SECRET`

See `apps/bot/README.md` for webhook setup.

## Export

- `GET /export/json/:childId` — family-scoped JSON export payload
