import { Injectable } from "@nestjs/common";
import { PrismaService } from "./prisma.service";

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async daily(childId: string, date = new Date()) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const events = await this.prisma.event.findMany({
      where: {
        childId,
        deletedAt: null,
        occurredAt: { gte: start, lt: end }
      },
      include: {
        feedingEvent: true,
        sleepEvent: true,
        diaperEvent: true,
        symptomEvent: true,
        measurement: true
      }
    });

    const feedingVolumeMl = events.reduce(
      (sum, event) => sum + (event.feedingEvent?.volumeMl ?? 0),
      0
    );
    const sleepMinutes = events.reduce((sum, event) => {
      if (!event.sleepEvent?.endAt) return sum;
      return sum + Math.max(0, event.sleepEvent.endAt.getTime() - event.sleepEvent.startAt.getTime()) / 60000;
    }, 0);

    return {
      childId,
      date: start.toISOString().slice(0, 10),
      counts: {
        feeding: events.filter((event) => event.type === "feeding").length,
        sleep: events.filter((event) => event.type === "sleep").length,
        diaper: events.filter((event) => event.type === "diaper").length,
        symptom: events.filter((event) => event.type === "symptom").length
      },
      feedingVolumeMl,
      sleepMinutes
    };
  }

  async weekly(childId: string, date = new Date()) {
    const end = new Date(date);
    const start = new Date(end);
    start.setDate(start.getDate() - 7);

    const events = await this.prisma.event.groupBy({
      by: ["type"],
      where: {
        childId,
        deletedAt: null,
        occurredAt: { gte: start, lte: end }
      },
      _count: true
    });

    return {
      childId,
      from: start.toISOString(),
      to: end.toISOString(),
      countsByType: events.map((item) => ({ type: item.type, count: item._count }))
    };
  }
}
