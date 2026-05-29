"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ChildRequiredNotice } from "@/components/ChildRequiredNotice";
import { ErrorBanner } from "@/components/ErrorBanner";
import { StatCard } from "@/components/StatCard";
import { TimelineList } from "@/components/TimelineList";
import { useAuth } from "@/lib/auth-context";
import { useAppError } from "@/lib/error-context";
import { fetchDailyAnalytics, fetchTimeline } from "@/lib/services";
import type { ApiEvent, DailyAnalytics } from "@/lib/types";
import { filterEventsByDate, todayIsoDate } from "@/lib/utils";

export default function DashboardPage() {
  const { token, childId } = useAuth();
  const { runWithErrorHandling } = useAppError();
  const [analytics, setAnalytics] = useState<DailyAnalytics | null>(null);
  const [events, setEvents] = useState<ApiEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !childId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    void runWithErrorHandling(async () => {
      const [daily, timeline] = await Promise.all([
        fetchDailyAnalytics(token, childId),
        fetchTimeline(token, childId)
      ]);
      setAnalytics(daily);
      setEvents(filterEventsByDate(timeline, todayIsoDate()).slice(0, 8));
      return true;
    }).finally(() => setLoading(false));
  }, [token, childId, runWithErrorHandling]);

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <h1>Today</h1>
          <p>Daily summary based on confirmed events only.</p>
        </div>
        <Link className="btn btn-primary" href="/events/new">
          Add event
        </Link>
      </div>

      <ErrorBanner />
      <ChildRequiredNotice />

      {loading ? <div className="text-sm text-[var(--muted)]">Loading dashboard…</div> : null}

      {!childId || loading ? null : (
        <>
          <section className="grid-cards mb-6">
            <StatCard label="Feedings" value={analytics?.counts.feeding ?? 0} />
            <StatCard label="Sleep sessions" value={analytics?.counts.sleep ?? 0} />
            <StatCard
              label="Sleep minutes"
              value={Math.round(analytics?.sleepMinutes ?? 0)}
            />
            <StatCard label="Diapers" value={analytics?.counts.diaper ?? 0} />
            <StatCard label="Symptoms" value={analytics?.counts.symptom ?? 0} />
            <StatCard
              label="Feeding volume"
              value={`${analytics?.feedingVolumeMl ?? 0} ml`}
            />
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold">Recent final events</h2>
              <Link className="text-sm font-semibold text-[var(--accent)]" href="/timeline">
                View timeline
              </Link>
            </div>
            <TimelineList events={events} />
          </section>
        </>
      )}
    </AppShell>
  );
}
