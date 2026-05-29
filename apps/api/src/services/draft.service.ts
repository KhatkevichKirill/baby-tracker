import { Injectable, NotFoundException } from "@nestjs/common";
import { draftEventSchema, type DraftEvent } from "@baby-tracker/shared";
import { PrismaService } from "./prisma.service";
import { EventService } from "./event.service";

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
    const draft = await this.prisma.draftEvent.findUnique({
      where: { id },
      include: { rawInput: true }
    });
    if (!draft) throw new NotFoundException("Draft not found");
    if (draft.isConfirmed && draft.confirmedEventId) {
      return this.prisma.event.findUnique({ where: { id: draft.confirmedEventId } });
    }

    const occurredAt = draft.occurredAt ?? draft.createdAt;
    const event = await this.eventService.create({
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

    await this.prisma.draftEvent.update({
      where: { id },
      data: {
        isConfirmed: true,
        confirmedEventId: event?.id
      }
    });

    if (!event?.id) return event;

    return this.prisma.event.findUnique({
      where: { id: event.id },
      include: {
        feedingEvent: true,
        sleepEvent: true,
        diaperEvent: true,
        symptomEvent: true,
        measurement: true,
        attachments: true,
        rawInput: true,
        fromDraftEvent: true
      }
    });
  }
}
