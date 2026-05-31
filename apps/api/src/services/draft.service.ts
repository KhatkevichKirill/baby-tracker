import { Injectable, NotFoundException } from "@nestjs/common";
import { z } from "zod";
import { draftEventSchema, type DraftEvent } from "@baby-tracker/shared";
import { FamilyAccessService } from "../auth/family-access.service";
import { PrismaService } from "./prisma.service";
import { EventService } from "./event.service";
import { eventInclude } from "../repositories/event.repository";

const createDraftBodySchema = draftEventSchema.extend({
  childId: z.string().uuid(),
  rawInputId: z.string().uuid()
});

@Injectable()
export class DraftService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventService: EventService,
    private readonly familyAccess: FamilyAccessService
  ) {}

  async create(familyIds: string[], input: unknown) {
    const payload = createDraftBodySchema.parse(input);
    const child = await this.familyAccess.assertChildAccess(familyIds, payload.childId);
    await this.familyAccess.assertRawInputForChild(familyIds, payload.rawInputId, child);

    const draft = draftEventSchema.parse({
      type: payload.type,
      occurredAt: payload.occurredAt,
      details: payload.details,
      confidence: payload.confidence,
      sourceFragment: payload.sourceFragment
    });
    return this.prisma.draftEvent.create({
      data: {
        familyId: child.familyId,
        childId: child.id,
        rawInputId: payload.rawInputId,
        type: draft.type,
        occurredAt: draft.occurredAt ? new Date(draft.occurredAt) : undefined,
        detailsJson: draft.details,
        confidence: draft.confidence,
        sourceFragment: draft.sourceFragment
      }
    });
  }

  async get(familyIds: string[], id: string) {
    return this.familyAccess.assertDraftAccess(familyIds, id);
  }

  async confirm(familyIds: string[], id: string, createdById: string) {
    await this.familyAccess.assertDraftAccess(familyIds, id);

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
      const event = await this.eventService.createInTransaction(
        tx,
        {
          familyId: draft.familyId,
          childId: draft.childId,
          createdById,
          rawInputId: draft.rawInputId,
          type: draft.type,
          occurredAt: occurredAt.toISOString(),
          source: draft.rawInput.source,
          details: draft.detailsJson as Record<string, unknown>,
          note: draft.sourceFragment
        },
        familyIds
      );

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
