import { describe, expect, it } from "vitest";
import {
  aggregateDailySummary,
  aggregateWeeklyTrends,
  clipSleepMinutesToWindow,
  formatDailySummaryText,
  parseDayWindow,
  parseWeekWindow,
  sleepOverlapsWindow,
  type AnalyticsEventRecord
} from "./analytics";

const childId = "11111111-1111-4111-8111-111111111111";

function feedingEvent(
  occurredAt: string,
  details: { kind: string; volumeMl?: number; durationMin?: number }
): AnalyticsEventRecord {
  return {
    type: "feeding",
    occurredAt: new Date(occurredAt),
    feedingEvent: details
  };
}

function sleepEvent(startAt: string, endAt?: string): AnalyticsEventRecord {
  return {
    type: "sleep",
    occurredAt: new Date(startAt),
    sleepEvent: {
      startAt: new Date(startAt),
      endAt: endAt ? new Date(endAt) : null
    }
  };
}

describe("sleep window clipping", () => {
  it("counts only the portion of sleep inside the day when crossing midnight", () => {
    const window = parseDayWindow("2026-05-30");
    const minutes = clipSleepMinutesToWindow(
      { startAt: new Date("2026-05-29T22:00:00.000Z"), endAt: new Date("2026-05-30T02:00:00.000Z") },
      window.start,
      window.end
    );
    expect(minutes).toBe(120);
  });

  it("treats open-ended sleep as ongoing through now within the day window", () => {
    const window = parseDayWindow("2026-05-30");
    const now = new Date("2026-05-30T10:00:00.000Z");
    const minutes = clipSleepMinutesToWindow(
      { startAt: new Date("2026-05-30T08:00:00.000Z"), endAt: null },
      window.start,
      window.end,
      now
    );
    expect(minutes).toBe(120);
  });

  it("detects overlap for sleep starting before the day and ending during it", () => {
    expect(
      sleepOverlapsWindow(
        { startAt: new Date("2026-05-29T23:00:00.000Z"), endAt: new Date("2026-05-30T01:00:00.000Z") },
        parseDayWindow("2026-05-30").start,
        parseDayWindow("2026-05-30").end
      )
    ).toBe(true);
  });
});

describe("aggregateDailySummary", () => {
  it("aggregates feeding volume/duration only when values are present", () => {
    const window = parseDayWindow("2026-05-30");
    const summary = aggregateDailySummary(
      childId,
      window,
      [
        feedingEvent("2026-05-30T08:00:00.000Z", { kind: "breast", durationMin: 15 }),
        feedingEvent("2026-05-30T12:00:00.000Z", { kind: "formula", volumeMl: 120 }),
        feedingEvent("2026-05-30T16:00:00.000Z", { kind: "breast" })
      ]
    );

    expect(summary.feeding.count).toBe(3);
    expect(summary.feeding.totalVolumeMl).toBe(120);
    expect(summary.feeding.totalDurationMin).toBe(15);
    expect(summary.feeding.byKind).toEqual({ breast: 2, formula: 1 });
  });

  it("includes sleep that crosses midnight and marks ongoing sessions", () => {
    const window = parseDayWindow("2026-05-30");
    const summary = aggregateDailySummary(
      childId,
      window,
      [
        sleepEvent("2026-05-29T22:00:00.000Z", "2026-05-30T02:00:00.000Z"),
        sleepEvent("2026-05-30T08:00:00.000Z")
      ],
      new Date("2026-05-30T10:00:00.000Z")
    );

    expect(summary.sleep.sessionCount).toBe(2);
    expect(summary.sleep.totalMinutes).toBe(240);
    expect(summary.sleep.ongoingSessions).toBe(1);
  });

  it("ignores deleted events", () => {
    const window = parseDayWindow("2026-05-30");
    const deletedFeeding: AnalyticsEventRecord = {
      ...feedingEvent("2026-05-30T08:00:00.000Z", { kind: "formula", volumeMl: 90 }),
      deletedAt: new Date("2026-05-30T09:00:00.000Z")
    };
    const summary = aggregateDailySummary(childId, window, [deletedFeeding]);

    expect(summary.feeding.count).toBe(0);
    expect(summary.feeding.totalVolumeMl).toBeNull();
  });

  it("uses edited event values from the latest structured payload", () => {
    const window = parseDayWindow("2026-05-30");
    const edited = feedingEvent("2026-05-30T08:00:00.000Z", {
      kind: "formula",
      volumeMl: 150
    });
    const summary = aggregateDailySummary(childId, window, [edited]);
    expect(summary.feeding.totalVolumeMl).toBe(150);
  });

  it("reports symptoms and temperature readings without interpretation", () => {
    const window = parseDayWindow("2026-05-30");
    const summary = aggregateDailySummary(childId, window, [
      {
        type: "symptom",
        occurredAt: new Date("2026-05-30T09:00:00.000Z"),
        symptomEvent: { symptomType: "cough", temperatureC: 37.4 }
      },
      {
        type: "symptom",
        occurredAt: new Date("2026-05-30T15:00:00.000Z"),
        symptomEvent: { symptomType: "rash" }
      }
    ]);

    expect(summary.symptoms.count).toBe(2);
    expect(summary.symptoms.withTemperature).toBe(1);
    expect(summary.symptoms.temperatureReadingsC).toEqual([37.4]);
    expect(summary.symptoms.types).toEqual(["cough", "rash"]);
  });
});

describe("aggregateWeeklyTrends", () => {
  it("builds per-day trends and week-level weight/temperature stats", () => {
    const week = parseWeekWindow("2026-05-30");
    const trends = aggregateWeeklyTrends(childId, week, [
      feedingEvent("2026-05-29T10:00:00.000Z", { kind: "formula", volumeMl: 100 }),
      sleepEvent("2026-05-29T20:00:00.000Z", "2026-05-30T06:00:00.000Z"),
      {
        type: "measurement",
        occurredAt: new Date("2026-05-29T12:00:00.000Z"),
        measurement: { weightKg: 4.1, temperatureC: 36.6 }
      },
      {
        type: "diaper",
        occurredAt: new Date("2026-05-30T11:00:00.000Z"),
        diaperEvent: { kind: "mixed" }
      },
      {
        type: "symptom",
        occurredAt: new Date("2026-05-30T13:00:00.000Z"),
        symptomEvent: { symptomType: "fever", temperatureC: 38.1 }
      },
      {
        type: "measurement",
        occurredAt: new Date("2026-05-30T18:00:00.000Z"),
        measurement: { weightKg: 4.15 }
      }
    ]);

    expect(trends.days).toHaveLength(7);
    expect(trends.from).toBe("2026-05-24");
    expect(trends.to).toBe("2026-05-30");
    expect(trends.weight.startKg).toBe(4.1);
    expect(trends.weight.endKg).toBe(4.15);
    expect(trends.weight.changeKg).toBe(0.05);
    expect(trends.temperature.minC).toBe(36.6);
    expect(trends.temperature.maxC).toBe(38.1);
    expect(trends.temperature.readingCount).toBe(2);
    expect(trends.totals.diaper.count).toBe(1);
  });
});

describe("formatDailySummaryText", () => {
  it("formats a factual telegram-friendly summary", () => {
    const window = parseDayWindow("2026-05-30");
    const summary = aggregateDailySummary(childId, window, [
      feedingEvent("2026-05-30T08:00:00.000Z", { kind: "breast", durationMin: 10 }),
      sleepEvent("2026-05-30T09:00:00.000Z", "2026-05-30T10:00:00.000Z")
    ]);
    const text = formatDailySummaryText(summary);
    expect(text).toContain("Сводка за 2026-05-30");
    expect(text).toContain("не медицинский совет");
    expect(text).not.toMatch(/диагноз|лечени/i);
  });
});
