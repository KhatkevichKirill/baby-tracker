# Web MVP Routes

Next.js App Router frontend for the Baby Tracker diary.

## Routes

- `/login` — session login
- `/` — today dashboard (daily summary + recent final events)
- `/timeline` — daily timeline with date/type filters
- `/events/new` — create final event
- `/events/[id]/edit` — edit/delete final event
- `/drafts` — LLM draft confirmation queue
- `/analytics` — daily/weekly summaries
- `/child` — child profile create/select

## Environment

- `PORT_WEB` — dev server port (default `3000`)
- `NEXT_PUBLIC_API_URL` — API base URL (default `http://localhost:3001`)

## Notes

- Final events and drafts are visually separated (`badge-final` vs `badge-draft`).
- Draft reject is client-side only until the API adds a reject endpoint.
- Child and draft list endpoints are not available yet; the UI stores active child/draft IDs in browser storage.
