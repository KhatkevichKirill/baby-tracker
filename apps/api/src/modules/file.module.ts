import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Module,
  Param,
  Post,
  StreamableFile,
  UploadedFile,
  UseInterceptors
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { z } from "zod";
import { CurrentUser } from "../auth/current-user.decorator";
import type { RequestUser } from "../auth/auth.types";
import { zodPipe } from "../common/pipes/zod-validation.pipe";
import { AttachmentService } from "../services/attachment.service";
import { MAX_ATTACHMENT_BYTES } from "../services/attachment.constants";
import { AuthModule } from "./auth.module";

const uploadBodySchema = z.object({
  eventId: z.string().uuid()
});

type UploadedFilePayload = {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
};

@Controller("files")
class FileController {
  constructor(private readonly attachments: AttachmentService) {}

  @Post("upload")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: MAX_ATTACHMENT_BYTES, files: 1 }
    })
  )
  upload(
    @CurrentUser() user: RequestUser,
    @UploadedFile() file: UploadedFilePayload | undefined,
    @Body(zodPipe(uploadBodySchema)) body: z.infer<typeof uploadBodySchema>
  ) {
    if (!file) {
      throw new BadRequestException("File is required");
    }

    return this.attachments.upload(user.familyIds, {
      eventId: body.eventId,
      fileName: file.originalname,
      mimeType: file.mimetype,
      buffer: file.buffer
    });
  }

  @Get(":id")
  metadata(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.attachments.getMetadata(user.familyIds, id);
  }

  @Get(":id/download")
  @Header("Cache-Control", "private, no-store")
  async download(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string
  ): Promise<StreamableFile> {
    const { file } = await this.attachments.download(user.familyIds, id, "attachment");
    return file;
  }

  @Get(":id/preview")
  @Header("Cache-Control", "private, no-store")
  async preview(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string
  ): Promise<StreamableFile> {
    const attachment = await this.attachments.getMetadata(user.familyIds, id);
    if (!this.attachments.canPreview(attachment.mimeType)) {
      throw new BadRequestException("Preview is not available for this file type");
    }
    const { file } = await this.attachments.download(user.familyIds, id, "inline");
    return file;
  }

  @Delete(":id")
  remove(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.attachments.deleteById(user.familyIds, id);
  }
}

@Module({
  imports: [AuthModule],
  controllers: [FileController],
  providers: [AttachmentService],
  exports: [AttachmentService]
})
export class FileModule {}
