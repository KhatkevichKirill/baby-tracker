import { Injectable } from "@nestjs/common";
import { z } from "zod";
import { sourceSchema } from "@baby-tracker/shared";
import { FamilyAccessService } from "../auth/family-access.service";
import { PrismaService } from "./prisma.service";

const createRawInputSchema = z.object({
  childId: z.string().uuid(),
  source: sourceSchema,
  text: z.string().min(1).max(5000),
  telegramChatId: z.string().optional()
});

@Injectable()
export class RawInputService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly familyAccess: FamilyAccessService
  ) {}

  async create(familyIds: string[], input: unknown) {
    const payload = createRawInputSchema.parse(input);
    const child = await this.familyAccess.assertChildAccess(familyIds, payload.childId);

    return this.prisma.rawInput.create({
      data: {
        familyId: child.familyId,
        childId: child.id,
        source: payload.source,
        text: payload.text,
        telegramChatId: payload.telegramChatId
      }
    });
  }

  async getById(familyIds: string[], rawInputId: string) {
    await this.familyAccess.assertRawInputAccess(familyIds, rawInputId);
    return this.prisma.rawInput.findUnique({
      where: { id: rawInputId },
      include: { draftEvents: true, events: true }
    });
  }
}
