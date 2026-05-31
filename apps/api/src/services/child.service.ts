import { Injectable } from "@nestjs/common";
import { z } from "zod";
import { FamilyAccessService } from "../auth/family-access.service";
import { PrismaService } from "./prisma.service";

const createChildSchema = z.object({
  name: z.string().min(1).max(120),
  dateOfBirth: z.string().datetime(),
  sexAtBirth: z.string().max(32).optional()
});

@Injectable()
export class ChildService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly familyAccess: FamilyAccessService
  ) {}

  async create(userId: string, familyIds: string[], input: unknown) {
    const payload = createChildSchema.parse(input);
    const familyId = await this.familyAccess.getPrimaryFamilyId(userId);
    this.familyAccess.assertFamilyAccess(familyIds, familyId);

    return this.prisma.child.create({
      data: {
        familyId,
        name: payload.name,
        dateOfBirth: new Date(payload.dateOfBirth),
        sexAtBirth: payload.sexAtBirth
      }
    });
  }

  async getById(familyIds: string[], childId: string) {
    return this.familyAccess.assertChildAccess(familyIds, childId);
  }
}
