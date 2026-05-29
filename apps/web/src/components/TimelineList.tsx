"use client";

import Link from "next/link";
import { EventTypeBadge } from "@/components/EventTypeBadge";
import type { ApiEvent } from "@/lib/types";
import { eventSummary, formatDate, formatTime } from "@/lib/utils";

export function TimelineList({ events }: { events: ApiEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="card p-6 text-sm text-[var(--muted)]">
        No final events match the current filters.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {events.map((event) => (
        <article key={event.id} className="card p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <EventTypeBadge type={event.type} variant="final" />
                <span className="text-sm font-semibold text-[var(--muted)]">
                  {formatDate(event.occurredAt)} · {formatTime(event.occurredAt)}
                </span>
              </div>
              <div>{eventSummary(event)}</div>
              {event.note ? (
                <div className="text-sm text-[var(--muted)]">{event.note}</div>
              ) : null}
            </div>
            <Link className="btn btn-secondary" href={`/events/${event.id}/edit`}>
              Edit
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}
