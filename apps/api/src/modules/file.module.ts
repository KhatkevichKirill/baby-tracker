import { Body, Controller, Get, Module, Param, Post } from "@nestjs/common";
import { z } from "zod";
import { CurrentUser } from "../auth/current-user.decorator";
import type { RequestUser } from "../auth/auth.types";
import { FamilyAccessService } from "../auth/family-access.service";
import { PrismaService } from "../services/prisma.service";
import { AuthModule } from "./auth.module";

const createAttachmentSchema = z.object({
  eventId: z.string().uuid(),
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(120),
  sizeBytes: z.number().int().positive().max(10 * 1024 * 1024),
  storagePath: z.string().min(1).max(500)
});

@Controller("files")
class FileController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly familyAccess: FamilyAccessService
  ) {}

  @Post()
  async createMetadata(@CurrentUser() user: RequestUser, @Body() body: unknown) {
    const payload = createAttachmentSchema.parse(body);
    const event = await this.familyAccess.assertEventAccess(user.familyIds, payload.eventId);

    return this.prisma.eventAttachment.create({
      data: {
        eventId: event.id,
        familyId: event.familyId,
        childId: event.childId,
        fileName: payload.fileName,
        mimeType: payload.mimeType,
        sizeBytes: payload.sizeBytes,
        storagePath: payload.storagePath
      }
    });
  }

  @Get(":id")
  async byId(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    await this.familyAccess.assertAttachmentAccess(user.familyIds, id);
    return this.prisma.eventAttachment.findUnique({ where: { id } });
  }
}

@Module({
  imports: [AuthModule],
  controllers: [FileController]
})
export class FileModule {}
