"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ChildRequiredNotice } from "@/components/ChildRequiredNotice";
import { ErrorBanner } from "@/components/ErrorBanner";
import { TimelineList } from "@/components/TimelineList";
import { useAuth } from "@/lib/auth-context";
import { useAppError } from "@/lib/error-context";
import { fetchTimeline } from "@/lib/services";
import type { ApiEvent, EventType } from "@/lib/types";
import { EVENT_TYPE_LABELS, MVP_EVENT_TYPES } from "@/lib/types";
import { filterEventsByDate, filterEventsByType, todayIsoDate } from "@/lib/utils";

export default function TimelinePage() {
  const { token, childId } = useAuth();
  const { runWithErrorHandling } = useAppError();
  const [events, setEvents] = useState<ApiEvent[]>([]);
  const [date, setDate] = useState(todayIsoDate());
  const [type, setType] = useState<EventType | "all">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !childId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    void runWithErrorHandling(async () => {
      const timeline = await fetchTimeline(token, childId, type === "all" ? undefined : type);
      setEvents(timeline);
      return true;
    }).finally(() => setLoading(false));
  }, [token, childId, type, runWithErrorHandling]);

  const filteredEvents = useMemo(
    () => filterEventsByDate(filterEventsByType(events, type), date),
    [events, date, type]
  );

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <h1>Timeline</h1>
          <p>Final confirmed events only. Drafts appear on the Drafts screen.</p>
        </div>
        <Link className="btn btn-primary" href="/events/new">
          Add event
        </Link>
      </div>

      <ErrorBanner />
      <ChildRequiredNotice />

      {childId ? (
        <div className="card mb-4 grid gap-4 p-4 md:grid-cols-2">
          <div className="field">
            <label htmlFor="date">Date</label>
            <input id="date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="type">Event type</label>
            <select
              id="type"
              value={type}
              onChange={(event) => setType(event.target.value as EventType | "all")}
            >
              <option value="all">All types</option>
              {MVP_EVENT_TYPES.map((item) => (
                <option key={item} value={item}>
                  {EVENT_TYPE_LABELS[item]}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : null}

      {loading ? <div className="text-sm text-[var(--muted)]">Loading timeline…</div> : null}
      {!loading && childId ? <TimelineList events={filteredEvents} /> : null}
    </AppShell>
  );
}
