import { z } from "zod";

export const ANALYTICS_DISCLAIMER =
  "Observational summary from recorded events only. Not medical advice or diagnosis.";

export const analyticsDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

export const dailyFeedingSummarySchema = z.object({
  count: z.number().int().nonnegative(),
  totalVolumeMl: z.number().nonnegative().nullable(),
  totalDurationMin: z.number().nonnegative().nullable(),
  byKind: z.record(z.string(), z.number().int().nonnegative())
});

export const dailySleepSummarySchema = z.object({
  sessionCount: z.number().int().nonnegative(),
  totalMinutes: z.number().nonnegative(),
  ongoingSessions: z.number().int().nonnegative()
});

export const dailyDiaperSummarySchema = z.object({
  count: z.number().int().nonnegative(),
  byKind: z.record(z.string(), z.number().int().nonnegative())
});

export const dailySymptomSummarySchema = z.object({
  count: z.number().int().nonnegative(),
  withTemperature: z.number().int().nonnegative(),
  temperatureReadingsC: z.array(z.number()),
  types: z.array(z.string())
});

export const dailyMeasurementSummarySchema = z.object({
  count: z.number().int().nonnegative(),
  weightKg: z.number().positive().nullable(),
  temperatureC: z.number().nullable()
});

export const dailySummarySchema = z.object({
  childId: z.string().uuid(),
  date: analyticsDateSchema,
  disclaimer: z.literal(ANALYTICS_DISCLAIMER),
  feeding: dailyFeedingSummarySchema,
  sleep: dailySleepSummarySchema,
  diaper: dailyDiaperSummarySchema,
  symptoms: dailySymptomSummarySchema,
  measurements: dailyMeasurementSummarySchema
});

export const weeklyDayTrendSchema = z.object({
  date: analyticsDateSchema,
  feeding: z.object({
    count: z.number().int().nonnegative(),
    totalVolumeMl: z.number().nonnegative().nullable(),
    totalDurationMin: z.number().nonnegative().nullable()
  }),
  sleep: z.object({
    sessionCount: z.number().int().nonnegative(),
    totalMinutes: z.number().nonnegative()
  }),
  diaper: z.object({
    count: z.number().int().nonnegative()
  }),
  weightKg: z.number().positive().nullable(),
  temperatureC: z.number().nullable()
});

export const weeklyTrendsSchema = z.object({
  childId: z.string().uuid(),
  from: analyticsDateSchema,
  to: analyticsDateSchema,
  disclaimer: z.literal(ANALYTICS_DISCLAIMER),
  days: z.array(weeklyDayTrendSchema),
  totals: z.object({
    feeding: dailyFeedingSummarySchema,
    sleep: dailySleepSummarySchema.omit({ ongoingSessions: true }),
    diaper: dailyDiaperSummarySchema
  }),
  averages: z.object({
    feedingCountPerDay: z.number().nonnegative(),
    sleepMinutesPerDay: z.number().nonnegative(),
    diaperCountPerDay: z.number().nonnegative()
  }),
  weight: z.object({
    startKg: z.number().positive().nullable(),
    endKg: z.number().positive().nullable(),
    changeKg: z.number().nullable()
  }),
  temperature: z.object({
    minC: z.number().nullable(),
    maxC: z.number().nullable(),
    readingCount: z.number().int().nonnegative()
  })
});

export type DailySummary = z.infer<typeof dailySummarySchema>;
export type WeeklyTrends = z.infer<typeof weeklyTrendsSchema>;

export type AnalyticsFeedingRecord = {
  kind: string;
  volumeMl?: number | null;
  durationMin?: number | null;
};

export type AnalyticsSleepRecord = {
  startAt: Date;
  endAt?: Date | null;
};

export type AnalyticsDiaperRecord = {
  kind: string;
};

export type AnalyticsSymptomRecord = {
  symptomType: string;
  temperatureC?: number | null;
};

export type AnalyticsMeasurementRecord = {
  weightKg?: number | null;
  temperatureC?: number | null;
};

export type AnalyticsEventRecord = {
  type: string;
  occurredAt: Date;
  deletedAt?: Date | null;
  feedingEvent?: AnalyticsFeedingRecord | null;
  sleepEvent?: AnalyticsSleepRecord | null;
  diaperEvent?: AnalyticsDiaperRecord | null;
  symptomEvent?: AnalyticsSymptomRecord | null;
  measurement?: AnalyticsMeasurementRecord | null;
};

export type DayWindow = {
  date: string;
  start: Date;
  end: Date;
};

export function parseDayWindow(dateInput: Date | string, timeZone = "UTC"): DayWindow {
  const date =
    typeof dateInput === "string"
      ? dateInput
      : dateInput.toISOString().slice(0, 10);

  const parsed = analyticsDateSchema.parse(date);
  const start = new Date(`${parsed}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  if (timeZone !== "UTC") {
    // All windows are normalized to UTC day boundaries for stable API output.
  }

  return { date: parsed, start, end };
}

export function parseWeekWindow(endDateInput: Date | string): { from: DayWindow; to: DayWindow; days: DayWindow[] } {
  const endDay = parseDayWindow(endDateInput);
  const days: DayWindow[] = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const dayStart = new Date(endDay.start);
    dayStart.setUTCDate(dayStart.getUTCDate() - offset);
    days.push(parseDayWindow(dayStart.toISOString().slice(0, 10)));
  }
  return {
    from: days[0]!,
    to: endDay,
    days
  };
}

export function sleepOverlapsWindow(
  sleep: AnalyticsSleepRecord,
  windowStart: Date,
  windowEnd: Date
): boolean {
  if (sleep.endAt == null) {
    return sleep.startAt < windowEnd;
  }
  return sleep.startAt < windowEnd && sleep.endAt > windowStart;
}

export function clipSleepMinutesToWindow(
  sleep: AnalyticsSleepRecord,
  windowStart: Date,
  windowEnd: Date,
  now = new Date()
): number {
  const rawEnd = sleep.endAt ?? now;
  const clippedStart = sleep.startAt > windowStart ? sleep.startAt : windowStart;
  const clippedEnd = rawEnd < windowEnd ? rawEnd : windowEnd;
  if (clippedEnd <= clippedStart) return 0;
  return (clippedEnd.getTime() - clippedStart.getTime()) / 60000;
}


function incrementKind(map: Record<string, number>, kind: string) {
  map[kind] = (map[kind] ?? 0) + 1;
}

function aggregateFeeding(events: AnalyticsEventRecord[]) {
  const feedingEvents = events.filter((event) => event.type === "feeding" && event.feedingEvent);
  const byKind: Record<string, number> = {};
  let volumeSum = 0;
  let volumeCount = 0;
  let durationSum = 0;
  let durationCount = 0;

  for (const event of feedingEvents) {
    const feeding = event.feedingEvent!;
    incrementKind(byKind, feeding.kind);
    if (feeding.volumeMl != null) {
      volumeSum += feeding.volumeMl;
      volumeCount += 1;
    }
    if (feeding.durationMin != null) {
      durationSum += feeding.durationMin;
      durationCount += 1;
    }
  }

  return {
    count: feedingEvents.length,
    totalVolumeMl: volumeCount > 0 ? volumeSum : null,
    totalDurationMin: durationCount > 0 ? durationSum : null,
    byKind
  };
}

function aggregateSleepForWindow(
  events: AnalyticsEventRecord[],
  window: DayWindow,
  now = new Date()
) {
  const sleepEvents = events.filter(
    (event) =>
      event.type === "sleep" &&
      event.sleepEvent &&
      !event.deletedAt &&
      sleepOverlapsWindow(event.sleepEvent, window.start, window.end)
  );

  let totalMinutes = 0;
  let ongoingSessions = 0;

  for (const event of sleepEvents) {
    const sleep = event.sleepEvent!;
    totalMinutes += clipSleepMinutesToWindow(sleep, window.start, window.end, now);
    if (!sleep.endAt && sleepOverlapsWindow(sleep, window.start, window.end)) {
      ongoingSessions += 1;
    }
  }

  return {
    sessionCount: sleepEvents.length,
    totalMinutes: Math.round(totalMinutes * 10) / 10,
    ongoingSessions
  };
}

function aggregateDiaper(events: AnalyticsEventRecord[]) {
  const diaperEvents = events.filter((event) => event.type === "diaper" && event.diaperEvent);
  const byKind: Record<string, number> = {};
  for (const event of diaperEvents) {
    incrementKind(byKind, event.diaperEvent!.kind);
  }
  return {
    count: diaperEvents.length,
    byKind
  };
}

function aggregateSymptoms(events: AnalyticsEventRecord[]) {
  const symptomEvents = events.filter((event) => event.type === "symptom" && event.symptomEvent);
  const types = new Set<string>();
  const temperatureReadingsC: number[] = [];

  for (const event of symptomEvents) {
    const symptom = event.symptomEvent!;
    types.add(symptom.symptomType);
    if (symptom.temperatureC != null) {
      temperatureReadingsC.push(symptom.temperatureC);
    }
  }

  return {
    count: symptomEvents.length,
    withTemperature: temperatureReadingsC.length,
    temperatureReadingsC,
    types: [...types].sort()
  };
}

function aggregateMeasurements(events: AnalyticsEventRecord[]) {
  const measurementEvents = events.filter(
    (event) => event.type === "measurement" && event.measurement
  );
  const weights = measurementEvents
    .map((event) => event.measurement!.weightKg)
    .filter((value): value is number => value != null);
  const temperatures = measurementEvents
    .map((event) => event.measurement!.temperatureC)
    .filter((value): value is number => value != null);

  return {
    count: measurementEvents.length,
    weightKg: weights.length > 0 ? weights[weights.length - 1]! : null,
    temperatureC: temperatures.length > 0 ? temperatures[temperatures.length - 1]! : null
  };
}

function filterNonSleepByOccurredAt(events: AnalyticsEventRecord[], window: DayWindow) {
  return events.filter(
    (event) =>
      event.type !== "sleep" &&
      !event.deletedAt &&
      event.occurredAt >= window.start &&
      event.occurredAt < window.end
  );
}

export function aggregateDailySummary(
  childId: string,
  window: DayWindow,
  events: AnalyticsEventRecord[],
  now = new Date()
): DailySummary {
  const nonSleepEvents = filterNonSleepByOccurredAt(events, window);
  const sleepSource = events.filter((event) => event.type === "sleep" && !event.deletedAt);

  const summary = {
    childId,
    date: window.date,
    disclaimer: ANALYTICS_DISCLAIMER as typeof ANALYTICS_DISCLAIMER,
    feeding: aggregateFeeding(nonSleepEvents),
    sleep: aggregateSleepForWindow(sleepSource, window, now),
    diaper: aggregateDiaper(nonSleepEvents),
    symptoms: aggregateSymptoms(nonSleepEvents),
    measurements: aggregateMeasurements(nonSleepEvents)
  };

  return dailySummarySchema.parse(summary);
}

function latestTemperatureForDay(events: AnalyticsEventRecord[]): number | null {
  const readings: Array<{ at: Date; value: number }> = [];
  for (const event of events) {
    if (event.symptomEvent?.temperatureC != null) {
      readings.push({ at: event.occurredAt, value: event.symptomEvent.temperatureC });
    }
    if (event.measurement?.temperatureC != null) {
      readings.push({ at: event.occurredAt, value: event.measurement.temperatureC });
    }
  }
  if (readings.length === 0) return null;
  readings.sort((a, b) => a.at.getTime() - b.at.getTime());
  return readings[readings.length - 1]!.value;
}

function latestWeightForDay(events: AnalyticsEventRecord[]): number | null {
  const weights = events
    .filter((event) => event.measurement?.weightKg != null)
    .sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime())
    .map((event) => event.measurement!.weightKg!);
  return weights.length > 0 ? weights[weights.length - 1]! : null;
}

export function aggregateWeeklyTrends(
  childId: string,
  week: ReturnType<typeof parseWeekWindow>,
  events: AnalyticsEventRecord[],
  now = new Date()
): WeeklyTrends {
  const sleepSource = events.filter((event) => event.type === "sleep" && !event.deletedAt);
  const days = week.days.map((day) => {
    const dayEvents = filterNonSleepByOccurredAt(events, day);
    const sleep = aggregateSleepForWindow(sleepSource, day, now);
    const feeding = aggregateFeeding(dayEvents);
    return {
      date: day.date,
      feeding: {
        count: feeding.count,
        totalVolumeMl: feeding.totalVolumeMl,
        totalDurationMin: feeding.totalDurationMin
      },
      sleep: {
        sessionCount: sleep.sessionCount,
        totalMinutes: sleep.totalMinutes
      },
      diaper: {
        count: aggregateDiaper(dayEvents).count
      },
      weightKg: latestWeightForDay(dayEvents),
      temperatureC: latestTemperatureForDay(dayEvents)
    };
  });

  const allNonSleep = week.days.flatMap((day) => filterNonSleepByOccurredAt(events, day));
  const totalsFeeding = aggregateFeeding(allNonSleep);
  const totalsSleepMinutes = days.reduce((sum, day) => sum + day.sleep.totalMinutes, 0);
  const totalsDiaper = aggregateDiaper(allNonSleep);
  const dayCount = days.length || 1;

  const weights = days
    .filter((day) => day.weightKg != null)
    .map((day) => ({ date: day.date, weightKg: day.weightKg! }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const temperatureReadings = days.flatMap((day) => {
    const dayEvents = filterNonSleepByOccurredAt(
      events,
      week.days.find((window) => window.date === day.date)!
    );
    const readings: number[] = [];
    for (const event of dayEvents) {
      if (event.symptomEvent?.temperatureC != null) readings.push(event.symptomEvent.temperatureC);
      if (event.measurement?.temperatureC != null) readings.push(event.measurement.temperatureC);
    }
    return readings;
  });

  const trends = {
    childId,
    from: week.from.date,
    to: week.to.date,
    disclaimer: ANALYTICS_DISCLAIMER as typeof ANALYTICS_DISCLAIMER,
    days,
    totals: {
      feeding: totalsFeeding,
      sleep: {
        sessionCount: days.reduce((sum, day) => sum + day.sleep.sessionCount, 0),
        totalMinutes: Math.round(totalsSleepMinutes * 10) / 10
      },
      diaper: totalsDiaper
    },
    averages: {
      feedingCountPerDay: Math.round((totalsFeeding.count / dayCount) * 10) / 10,
      sleepMinutesPerDay: Math.round((totalsSleepMinutes / dayCount) * 10) / 10,
      diaperCountPerDay: Math.round((totalsDiaper.count / dayCount) * 10) / 10
    },
    weight: {
      startKg: weights[0]?.weightKg ?? null,
      endKg: weights[weights.length - 1]?.weightKg ?? null,
      changeKg:
        weights.length >= 2
          ? Math.round((weights[weights.length - 1]!.weightKg - weights[0]!.weightKg) * 1000) / 1000
          : null
    },
    temperature: {
      minC: temperatureReadings.length > 0 ? Math.min(...temperatureReadings) : null,
      maxC: temperatureReadings.length > 0 ? Math.max(...temperatureReadings) : null,
      readingCount: temperatureReadings.length
    }
  };

  return weeklyTrendsSchema.parse(trends);
}

function formatNullableNumber(value: number | null, suffix = ""): string {
  return value == null ? "—" : `${value}${suffix}`;
}

export function formatDailySummaryText(summary: DailySummary): string {
  const lines = [
    `Сводка за ${summary.date}`,
    "",
    `Кормления: ${summary.feeding.count}`,
    `  объём: ${formatNullableNumber(summary.feeding.totalVolumeMl, " мл")}`,
    `  длительность: ${formatNullableNumber(summary.feeding.totalDurationMin, " мин")}`,
    `Сон: ${summary.sleep.totalMinutes} мин (${summary.sleep.sessionCount} сессий${
      summary.sleep.ongoingSessions > 0 ? `, ${summary.sleep.ongoingSessions} без окончания` : ""
    })`,
    `Подгузники: ${summary.diaper.count}`,
    `Симптомы: ${summary.symptoms.count}${
      summary.symptoms.temperatureReadingsC.length > 0
        ? ` (температура: ${summary.symptoms.temperatureReadingsC.join(", ")} °C)`
        : ""
    }`,
    summary.measurements.weightKg != null ? `Вес: ${summary.measurements.weightKg} кг` : null,
    "",
    "Только записанные наблюдения, не медицинский совет."
  ].filter((line): line is string => line != null);

  return lines.join("\n");
}
