import { Body, Controller, Get, Module, Param, Post } from "@nestjs/common";
import { PrismaService } from "../services/prisma.service";

type CreateAttachmentDto = {
  eventId: string;
  familyId: string;
  childId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
};

@Controller("files")
class FileController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  createMetadata(@Body() payload: CreateAttachmentDto) {
    if (payload.sizeBytes > 10 * 1024 * 1024) {
      throw new Error("File is too large");
    }
    return this.prisma.eventAttachment.create({ data: payload });
  }

  @Get(":id")
  byId(@Param("id") id: string) {
    return this.prisma.eventAttachment.findUnique({ where: { id } });
  }
}

@Module({
  controllers: [FileController]
})
export class FileModule {}
