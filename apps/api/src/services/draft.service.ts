import { Injectable, NotFoundException } from "@nestjs/common";
import { draftEventSchema, type DraftEvent } from "@baby-tracker/shared";
import { PrismaService } from "./prisma.service";
import { EventService } from "./event.service";
import { eventInclude } from "../repositories/event.repository";

@Injectable()
export class DraftService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventService: EventService
  ) {}

  async create(input: DraftEvent & { familyId: string; childId: string; rawInputId: string }) {
    const draft = draftEventSchema.parse(input);
    return this.prisma.draftEvent.create({
      data: {
        familyId: input.familyId,
        childId: input.childId,
        rawInputId: input.rawInputId,
        type: draft.type,
        occurredAt: draft.occurredAt ? new Date(draft.occurredAt) : undefined,
        detailsJson: draft.details,
        confidence: draft.confidence,
        sourceFragment: draft.sourceFragment
      }
    });
  }

  async get(id: string) {
    return this.prisma.draftEvent.findUnique({ where: { id } });
  }

  async confirm(id: string, createdById: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "DraftEvent" WHERE id = ${id} FOR UPDATE`;

      const draft = await tx.draftEvent.findUnique({
        where: { id },
        include: { rawInput: true }
      });
      if (!draft) throw new NotFoundException("Draft not found");

      if (draft.isConfirmed && draft.confirmedEventId) {
        return tx.event.findUnique({
          where: { id: draft.confirmedEventId },
          include: eventInclude
        });
      }

      const occurredAt = draft.occurredAt ?? draft.createdAt;
      const event = await this.eventService.createInTransaction(tx, {
        familyId: draft.familyId,
        childId: draft.childId,
        createdById,
        rawInputId: draft.rawInputId,
        type: draft.type,
        occurredAt: occurredAt.toISOString(),
        source: draft.rawInput.source,
        details: draft.detailsJson as Record<string, unknown>,
        note: draft.sourceFragment
      });

      if (!event?.id) {
        throw new Error("Failed to create event from draft");
      }

      await tx.draftEvent.update({
        where: { id },
        data: {
          isConfirmed: true,
          confirmedEventId: event.id
        }
      });

      return tx.event.findUnique({
        where: { id: event.id },
        include: eventInclude
      });
    });
  }
}
