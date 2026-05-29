import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../services/prisma.service";

export type AuditAction = "create" | "update" | "delete";

@Injectable()
export class AuditRepository {
  constructor(private readonly prisma: PrismaService) {}

  log(
    input: {
      familyId: string;
      childId?: string;
      actorUserId?: string;
      action: AuditAction;
      entityType: string;
      entityId: string;
      metadata?: Prisma.InputJsonValue;
    },
    tx?: Prisma.TransactionClient
  ) {
    const client = tx ?? this.prisma;
    return client.auditLog.create({
      data: {
        familyId: input.familyId,
        childId: input.childId,
        actorUserId: input.actorUserId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        metadata: input.metadata
      }
    });
  }
}
