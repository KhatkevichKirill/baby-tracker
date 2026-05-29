# API Contract Draft

## Auth
- `POST /auth/setup`
- `POST /auth/login`

## Child
- `POST /children`
- `GET /children/:id`

## Events
- `POST /events`
- `GET /events/timeline/:childId?type=<event_type>`

## Raw Inputs
- `POST /raw-inputs`
- `GET /raw-inputs/:id`

## Drafts
- `POST /drafts`
- `GET /drafts/:id`
- `PATCH /drafts/:id/confirm`

## Analytics
- `GET /analytics/daily/:childId`
- `GET /analytics/weekly/:childId`

## Telegram
- `POST /telegram/webhook`

## Export
- `GET /export/json/:childId`
