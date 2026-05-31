import { Injectable } from "@nestjs/common";
import {
  aggregateDailySummary,
  aggregateWeeklyTrends,
  formatDailySummaryText,
  parseDayWindow,
  parseWeekWindow,
  type AnalyticsEventRecord,
  type DailySummary,
  type WeeklyTrends
} from "@baby-tracker/shared";
import { FamilyAccessService } from "../auth/family-access.service";
import { PrismaService } from "./prisma.service";

const analyticsInclude = {
  feedingEvent: true,
  sleepEvent: true,
  diaperEvent: true,
  symptomEvent: true,
  measurement: true
} as const;

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly familyAccess: FamilyAccessService
  ) {}

  async daily(
    familyIds: string[],
    childId: string,
    dateInput?: string
  ): Promise<DailySummary> {
    await this.familyAccess.assertChildAccess(familyIds, childId);
    const window = parseDayWindow(dateInput ?? new Date());
    const events = await this.loadEventsForDaily(childId, window);
    return aggregateDailySummary(childId, window, events);
  }

  async dailyText(familyIds: string[], childId: string, dateInput?: string): Promise<string> {
    const summary = await this.daily(familyIds, childId, dateInput);
    return formatDailySummaryText(summary);
  }

  async weekly(
    familyIds: string[],
    childId: string,
    dateInput?: string
  ): Promise<WeeklyTrends> {
    await this.familyAccess.assertChildAccess(familyIds, childId);
    const week = parseWeekWindow(dateInput ?? new Date());
    const events = await this.loadEventsForWeekly(childId, week);
    return aggregateWeeklyTrends(childId, week, events);
  }

  private async loadEventsForDaily(
    childId: string,
    window: ReturnType<typeof parseDayWindow>
  ): Promise<AnalyticsEventRecord[]> {
    const [nonSleepEvents, sleepEvents] = await Promise.all([
      this.prisma.event.findMany({
        where: {
          childId,
          deletedAt: null,
          type: { not: "sleep" },
          occurredAt: { gte: window.start, lt: window.end }
        },
        include: analyticsInclude
      }),
      this.prisma.event.findMany({
        where: {
          childId,
          deletedAt: null,
          type: "sleep",
          sleepEvent: {
            is: {
              startAt: { lt: window.end },
              OR: [{ endAt: null }, { endAt: { gt: window.start } }]
            }
          }
        },
        include: analyticsInclude
      })
    ]);

    const byId = new Map<string, AnalyticsEventRecord>();
    for (const event of [...nonSleepEvents, ...sleepEvents]) {
      byId.set(event.id, event as AnalyticsEventRecord);
    }
    return [...byId.values()];
  }

  private async loadEventsForWeekly(
    childId: string,
    week: ReturnType<typeof parseWeekWindow>
  ): Promise<AnalyticsEventRecord[]> {
    const [nonSleepEvents, sleepEvents] = await Promise.all([
      this.prisma.event.findMany({
        where: {
          childId,
          deletedAt: null,
          type: { not: "sleep" },
          occurredAt: { gte: week.from.start, lt: week.to.end }
        },
        include: analyticsInclude
      }),
      this.prisma.event.findMany({
        where: {
          childId,
          deletedAt: null,
          type: "sleep",
          sleepEvent: {
            is: {
              startAt: { lt: week.to.end },
              OR: [{ endAt: null }, { endAt: { gt: week.from.start } }]
            }
          }
        },
        include: analyticsInclude
      })
    ]);

    const byId = new Map<string, AnalyticsEventRecord>();
    for (const event of [...nonSleepEvents, ...sleepEvents]) {
      byId.set(event.id, event as AnalyticsEventRecord);
    }
    return [...byId.values()];
  }
}
