# Telegram Bot

Telegraf bot for Baby Tracker with account linking, structured commands, and draft confirmation flow.

## Environment

```env
TELEGRAM_BOT_TOKEN=...
TELEGRAM_BOT_SECRET=...   # shared with API, min 16 chars
API_BASE_URL=http://localhost:3001
```

## Local development (polling)

```bash
pnpm --filter @baby-tracker/bot dev
```

The bot process uses long polling and talks to the API with JWT obtained after `/link`.

## Account linking

1. Authenticated caregiver creates a one-time code in Web/API:

```http
POST /telegram/link-tokens
Authorization: Bearer <jwt>
Content-Type: application/json

{ "childId": "<uuid>" }
```

2. User sends in Telegram:

```text
/link AB12CD34
```

3. API links `telegramUserId` to the caregiver account and returns session `{ token, childId, childName }`.

Codes expire in 15 minutes and are single-use.

## Webhook setup (production)

Production traffic should hit the API webhook endpoint (reverse proxy prefix may add `/api`):

```text
https://<domain>/telegram/webhook
```

### 1. Configure env on API service

Ensure `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_SECRET`, and `API_BASE_URL` are set for the API container.

### 2. Register webhook with Telegram

```bash
curl -X POST "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  -H "content-type: application/json" \
  -d '{"url":"https://<domain>/telegram/webhook","allowed_updates":["message","callback_query"]}'
```

### 3. Verify

```bash
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getWebhookInfo"
```

Expected: `url` points to your domain and `last_error_message` is empty.

### Notes

- Webhook mode is handled inside `@baby-tracker/api` via `@baby-tracker/bot`.
- For local dev you can keep polling in `apps/bot` without registering a webhook.
- Do not run polling and webhook against the same bot token simultaneously.

## Bot commands

| Command | Action |
|---------|--------|
| `/start`, `/help` | Help + main inline menu |
| `/link CODE` | Link Telegram account |
| `/feed` | Feeding (inline kind selection) |
| `/sleep_start` | Start sleep event (`source=telegram`) |
| `/sleep_end` | Raw input for draft parsing |
| `/diaper` | Diaper (inline kind selection) |
| `/temp [value]` | Temperature measurement |
| `/note [text]` | Note event |

Free text is sent to `POST /raw-inputs` and never creates a final event until draft confirmation.

## Callback actions

| Callback | Action |
|----------|--------|
| `cmd:*` | Main menu shortcuts |
| `feed:*` | Feeding kind |
| `diaper:*` | Diaper kind |
| `draft:confirm:<id>` | `PATCH /drafts/:id/confirm` |
| `draft:edit:<id>` | Ask for corrected text |
| `draft:cancel:<id>` | Discard draft UI |

## Limitations

- Active child is chosen from the latest redeemed link token (fallback: first child in family).
- Draft notifications poll raw input for up to ~12 seconds; async worker latency may require a later message.
- `/sleep_end` uses raw-input + draft flow when exact start time is unknown.
- Unlinked users cannot create events or raw inputs.
