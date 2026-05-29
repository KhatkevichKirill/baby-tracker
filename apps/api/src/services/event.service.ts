import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  createEventInputSchema,
  feedingEventDetailsSchema,
  sleepEventDetailsSchema,
  diaperEventDetailsSchema,
  symptomEventDetailsSchema,
  measurementEventDetailsSchema,
  type CreateEventInput
} from "@baby-tracker/shared";
import { PrismaService } from "./prisma.service";

@Injectable()
export class EventService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateEventInput & { createdById: string; rawInputId?: string }) {
    const event = createEventInputSchema.parse(input);
    const base: Prisma.EventCreateInput = {
      family: { connect: { id: event.familyId } },
      child: { connect: { id: event.childId } },
      createdBy: { connect: { id: input.createdById } },
      rawInput: input.rawInputId ? { connect: { id: input.rawInputId } } : undefined,
      type: event.type,
      occurredAt: new Date(event.occurredAt),
      source: event.source,
      note: event.note,
      detailsJson: event.details
    };

    return this.prisma.$transaction(async (tx) => {
      const created = await tx.event.create({ data: base });
      await this.createSubtype(tx, created.id, event);
      return tx.event.findUnique({
        where: { id: created.id },
        include: {
          feedingEvent: true,
          sleepEvent: true,
          diaperEvent: true,
          symptomEvent: true,
          measurement: true,
          attachments: true
        }
      });
    });
  }

  async timeline(childId: string, type?: string) {
    return this.prisma.event.findMany({
      where: {
        childId,
        deletedAt: null,
        type: type as never
      },
      orderBy: { occurredAt: "desc" },
      include: {
        feedingEvent: true,
        sleepEvent: true,
        diaperEvent: true,
        symptomEvent: true,
        measurement: true,
        attachments: true
      }
    });
  }

  private async createSubtype(
    tx: Prisma.TransactionClient,
    eventId: string,
    event: CreateEventInput
  ) {
    if (event.type === "feeding") {
      const details = feedingEventDetailsSchema.parse(event.details);
      await tx.feedingEvent.create({ data: { eventId, ...details } });
    }
    if (event.type === "sleep") {
      const details = sleepEventDetailsSchema.parse(event.details);
      await tx.sleepEvent.create({
        data: {
          eventId,
          startAt: new Date(details.startAt),
          endAt: details.endAt ? new Date(details.endAt) : undefined,
          quality: details.quality,
          location: details.location
        }
      });
    }
    if (event.type === "diaper") {
      const details = diaperEventDetailsSchema.parse(event.details);
      await tx.diaperEvent.create({ data: { eventId, ...details } });
    }
    if (event.type === "symptom") {
      const details = symptomEventDetailsSchema.parse(event.details);
      await tx.symptomEvent.create({ data: { eventId, ...details } });
    }
    if (event.type === "measurement") {
      const details = measurementEventDetailsSchema.parse(event.details);
      await tx.measurementEvent.create({ data: { eventId, ...details } });
    }
  }
}
