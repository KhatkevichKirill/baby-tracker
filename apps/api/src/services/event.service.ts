import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, type EventType } from "@prisma/client";
import {
  createEventInputSchema,
  feedingEventDetailsSchema,
  sleepEventDetailsSchema,
  diaperEventDetailsSchema,
  symptomEventDetailsSchema,
  measurementEventDetailsSchema,
  updateEventInputSchema,
  type CreateEventInput
} from "@baby-tracker/shared";
import { AuditRepository } from "../repositories/audit.repository";
import { EventRepository } from "../repositories/event.repository";

@Injectable()
export class EventService {
  constructor(
    private readonly events: EventRepository,
    private readonly audit: AuditRepository
  ) {}

  async create(input: CreateEventInput & { createdById: string; rawInputId?: string }) {
    return this.events.transaction((tx) => this.createInTransaction(tx, input));
  }

  async createInTransaction(
    tx: Prisma.TransactionClient,
    input: CreateEventInput & { createdById: string; rawInputId?: string }
  ) {
    const event = createEventInputSchema.parse(input);

    const created = await this.events.create(
      {
        family: { connect: { id: event.familyId } },
        child: { connect: { id: event.childId } },
        createdBy: { connect: { id: input.createdById } },
        rawInput: input.rawInputId ? { connect: { id: input.rawInputId } } : undefined,
        type: event.type,
        occurredAt: new Date(event.occurredAt),
        source: event.source,
        note: event.note,
        detailsJson: event.details
      },
      tx
    );

    await this.createSubtype(tx, created.id, event);

    await this.audit.log(
      {
        familyId: event.familyId,
        childId: event.childId,
        actorUserId: input.createdById,
        action: "create",
        entityType: "event",
        entityId: created.id
      },
      tx
    );

    return this.events.findWithRelations(created.id, tx);
  }

  async getById(id: string) {
    const event = await this.events.findById(id);
    if (!event) throw new NotFoundException("Event not found");
    return event;
  }

  async update(
    id: string,
    input: {
      occurredAt?: string;
      note?: string | null;
      details?: Record<string, unknown>;
      actorUserId: string;
    }
  ) {
    const patch = updateEventInputSchema.parse(input);

    return this.events.transaction(async (tx) => {
      const existing = await tx.event.findFirst({
        where: { id, deletedAt: null },
        include: { feedingEvent: true, sleepEvent: true, diaperEvent: true, symptomEvent: true, measurement: true }
      });
      if (!existing) throw new NotFoundException("Event not found");

      const existingDetails =
        existing.detailsJson && typeof existing.detailsJson === "object" && !Array.isArray(existing.detailsJson)
          ? (existing.detailsJson as Record<string, unknown>)
          : {};
      const mergedDetails = patch.details ? { ...existingDetails, ...patch.details } : undefined;

      await this.events.update(
        id,
        {
          occurredAt: patch.occurredAt ? new Date(patch.occurredAt) : undefined,
          note: patch.note,
          detailsJson: mergedDetails
        },
        tx
      );

      if (patch.details) {
        await this.updateSubtype(tx, existing, patch.details);
      }

      await this.audit.log(
        {
          familyId: existing.familyId,
          childId: existing.childId,
          actorUserId: input.actorUserId,
          action: "update",
          entityType: "event",
          entityId: id,
          metadata: { fields: Object.keys(patch) }
        },
        tx
      );

      return this.events.findWithRelations(id, tx);
    });
  }

  async remove(id: string, actorUserId: string) {
    return this.events.transaction(async (tx) => {
      const existing = await tx.event.findFirst({ where: { id, deletedAt: null } });
      if (!existing) throw new NotFoundException("Event not found");

      await this.events.softDelete(id, tx);

      await this.audit.log(
        {
          familyId: existing.familyId,
          childId: existing.childId,
          actorUserId,
          action: "delete",
          entityType: "event",
          entityId: id
        },
        tx
      );

      return { id, deleted: true };
    });
  }

  timeline(childId: string, type?: string) {
    return this.events.findTimeline(childId, type as EventType | undefined);
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

  private async updateSubtype(
    tx: Prisma.TransactionClient,
    existing: {
      id: string;
      type: string;
      feedingEvent: unknown;
      sleepEvent: unknown;
      diaperEvent: unknown;
      symptomEvent: unknown;
      measurement: unknown;
    },
    details: Record<string, unknown>
  ) {
    if (existing.type === "feeding" && existing.feedingEvent) {
      const parsed = feedingEventDetailsSchema.partial().parse(details);
      await tx.feedingEvent.update({ where: { eventId: existing.id }, data: parsed });
    }
    if (existing.type === "sleep" && existing.sleepEvent) {
      const parsed = sleepEventDetailsSchema.partial().parse(details);
      await tx.sleepEvent.update({
        where: { eventId: existing.id },
        data: {
          ...parsed,
          startAt: parsed.startAt ? new Date(parsed.startAt) : undefined,
          endAt: parsed.endAt ? new Date(parsed.endAt) : undefined
        }
      });
    }
    if (existing.type === "diaper" && existing.diaperEvent) {
      const parsed = diaperEventDetailsSchema.partial().parse(details);
      await tx.diaperEvent.update({ where: { eventId: existing.id }, data: parsed });
    }
    if (existing.type === "symptom" && existing.symptomEvent) {
      const parsed = symptomEventDetailsSchema.partial().parse(details);
      await tx.symptomEvent.update({ where: { eventId: existing.id }, data: parsed });
    }
    if (existing.type === "measurement" && existing.measurement) {
      const parsed = measurementEventDetailsSchema.partial().parse(details);
      await tx.measurementEvent.update({ where: { eventId: existing.id }, data: parsed });
    }
  }
}
