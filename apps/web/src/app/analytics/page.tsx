"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ChildRequiredNotice } from "@/components/ChildRequiredNotice";
import { ErrorBanner } from "@/components/ErrorBanner";
import { EventTypeBadge } from "@/components/EventTypeBadge";
import { StatCard } from "@/components/StatCard";
import { useAuth } from "@/lib/auth-context";
import { useAppError } from "@/lib/error-context";
import { fetchDailyAnalytics, fetchWeeklyAnalytics } from "@/lib/services";
import type { DailyAnalytics, WeeklyAnalytics } from "@/lib/types";
import { EVENT_TYPE_LABELS } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export default function AnalyticsPage() {
  const { token, childId } = useAuth();
  const { runWithErrorHandling } = useAppError();
  const [daily, setDaily] = useState<DailyAnalytics | null>(null);
  const [weekly, setWeekly] = useState<WeeklyAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !childId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    void runWithErrorHandling(async () => {
      const [dailyResult, weeklyResult] = await Promise.all([
        fetchDailyAnalytics(token, childId),
        fetchWeeklyAnalytics(token, childId)
      ]);
      setDaily(dailyResult);
      setWeekly(weeklyResult);
      return true;
    }).finally(() => setLoading(false));
  }, [token, childId, runWithErrorHandling]);

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <h1>Analytics</h1>
          <p>Factual summaries from confirmed events. No medical interpretation.</p>
        </div>
      </div>

      <ErrorBanner />
      <ChildRequiredNotice />

      {loading ? <div className="text-sm text-[var(--muted)]">Loading analytics…</div> : null}

      {!loading && childId && daily && weekly ? (
        <>
          <section className="mb-8">
            <h2 className="mb-3 text-lg font-bold">Daily overview · {daily.date}</h2>
            <div className="grid-cards">
              <StatCard label="Feedings" value={daily.counts.feeding} />
              <StatCard label="Sleep sessions" value={daily.counts.sleep} />
              <StatCard label="Diapers" value={daily.counts.diaper} />
              <StatCard label="Symptoms logged" value={daily.counts.symptom} />
              <StatCard label="Feeding volume" value={`${daily.feedingVolumeMl} ml`} />
              <StatCard label="Sleep minutes" value={Math.round(daily.sleepMinutes)} />
            </div>
          </section>

          <section>
            <h2 className="mb-1 text-lg font-bold">Weekly counts</h2>
            <p className="mb-3 text-sm text-[var(--muted)]">
              {formatDate(weekly.from)} – {formatDate(weekly.to)}
            </p>
            <div className="space-y-3">
              {weekly.countsByType.length === 0 ? (
                <div className="card p-6 text-sm text-[var(--muted)]">
                  No confirmed events in the last 7 days.
                </div>
              ) : (
                weekly.countsByType.map((item) => (
                  <div
                    key={item.type}
                    className="card flex items-center justify-between gap-3 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <EventTypeBadge type={item.type} variant="final" />
                      <span>{EVENT_TYPE_LABELS[item.type as keyof typeof EVENT_TYPE_LABELS] ?? item.type}</span>
                    </div>
                    <div className="text-xl font-bold">{item.count}</div>
                  </div>
                ))
              )}
            </div>
          </section>
        </>
      ) : null}
    </AppShell>
  );
}
