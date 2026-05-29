import { Injectable } from "@nestjs/common";
import { Prisma, type Event, type EventType } from "@prisma/client";
import { PrismaService } from "../services/prisma.service";

export const eventInclude = {
  feedingEvent: true,
  sleepEvent: true,
  diaperEvent: true,
  symptomEvent: true,
  measurement: true,
  attachments: true,
  rawInput: true,
  fromDraftEvent: true
} satisfies Prisma.EventInclude;

export type EventWithRelations = Prisma.EventGetPayload<{ include: typeof eventInclude }>;

@Injectable()
export class EventRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.EventCreateInput, tx?: Prisma.TransactionClient): Promise<Event> {
    const client = tx ?? this.prisma;
    return client.event.create({ data });
  }

  findById(id: string): Promise<EventWithRelations | null> {
    return this.prisma.event.findFirst({
      where: { id, deletedAt: null },
      include: eventInclude
    });
  }

  findTimeline(childId: string, type?: EventType): Promise<EventWithRelations[]> {
    return this.prisma.event.findMany({
      where: {
        childId,
        deletedAt: null,
        ...(type ? { type } : {})
      },
      orderBy: { occurredAt: "desc" },
      include: eventInclude
    });
  }

  update(id: string, data: Prisma.EventUpdateInput, tx?: Prisma.TransactionClient): Promise<Event> {
    const client = tx ?? this.prisma;
    return client.event.update({ where: { id }, data });
  }

  softDelete(id: string, tx?: Prisma.TransactionClient): Promise<Event> {
    const client = tx ?? this.prisma;
    return client.event.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
  }

  findWithRelations(
    id: string,
    tx?: Prisma.TransactionClient
  ): Promise<EventWithRelations | null> {
    const client = tx ?? this.prisma;
    return client.event.findUnique({
      where: { id },
      include: eventInclude
    });
  }

  transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn);
  }
}
