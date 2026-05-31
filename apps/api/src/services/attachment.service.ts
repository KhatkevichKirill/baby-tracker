import {
  BadRequestException,
  Injectable,
  NotFoundException,
  StreamableFile
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { FamilyAccessService } from "../auth/family-access.service";
import { PrismaService } from "./prisma.service";
import {
  ALLOWED_ATTACHMENT_MIME_TYPES,
  MAX_ATTACHMENT_BYTES,
  PREVIEWABLE_MIME_TYPES
} from "./attachment.constants";

type UploadInput = {
  eventId: string;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
};

@Injectable()
export class AttachmentService {
  private readonly uploadsDir: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly familyAccess: FamilyAccessService
  ) {
    this.uploadsDir = path.resolve(process.env.UPLOADS_DIR ?? "./uploads");
  }

  async upload(familyIds: string[], input: UploadInput) {
    this.assertAllowedMime(input.mimeType);
    this.assertAllowedSize(input.buffer.byteLength);

    const event = await this.familyAccess.assertEventAccess(familyIds, input.eventId);
    const safeName = sanitizeFileName(input.fileName);
    const storagePath = path.join(
      event.familyId,
      event.childId,
      event.id,
      `${randomUUID()}-${safeName}`
    );
    const absolutePath = path.join(this.uploadsDir, storagePath);

    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, input.buffer);

    try {
      return await this.prisma.eventAttachment.create({
        data: {
          eventId: event.id,
          familyId: event.familyId,
          childId: event.childId,
          fileName: safeName,
          mimeType: input.mimeType,
          sizeBytes: input.buffer.byteLength,
          storagePath
        }
      });
    } catch (error) {
      await rm(absolutePath, { force: true });
      throw error;
    }
  }

  async getMetadata(familyIds: string[], id: string) {
    await this.familyAccess.assertAttachmentAccess(familyIds, id);
    const attachment = await this.prisma.eventAttachment.findUnique({ where: { id } });
    if (!attachment) {
      throw new NotFoundException("Attachment not found");
    }
    return attachment;
  }

  async download(familyIds: string[], id: string, disposition: "inline" | "attachment") {
    const attachment = await this.getMetadata(familyIds, id);
    const absolutePath = this.resolveStoragePath(attachment.storagePath);

    try {
      await stat(absolutePath);
    } catch {
      throw new NotFoundException("Attachment file not found");
    }

    const stream = createReadStream(absolutePath);
    return {
      attachment,
      file: new StreamableFile(stream, {
        type: attachment.mimeType,
        disposition: `${disposition}; filename="${encodeURIComponent(attachment.fileName)}"`
      })
    };
  }

  canPreview(mimeType: string) {
    return PREVIEWABLE_MIME_TYPES.has(mimeType);
  }

  async deleteById(familyIds: string[], id: string) {
    const attachment = await this.getMetadata(familyIds, id);
    await this.deleteStoredFile(attachment.storagePath);
    await this.prisma.eventAttachment.delete({ where: { id } });
    return { id, deleted: true };
  }

  async purgeEventAttachments(eventId: string) {
    const attachments = await this.prisma.eventAttachment.findMany({ where: { eventId } });
    await Promise.all(attachments.map((attachment) => this.deleteStoredFile(attachment.storagePath)));
    if (attachments.length > 0) {
      await this.prisma.eventAttachment.deleteMany({ where: { eventId } });
    }
    return attachments.length;
  }

  private assertAllowedMime(mimeType: string) {
    if (!ALLOWED_ATTACHMENT_MIME_TYPES.has(mimeType)) {
      throw new BadRequestException("Unsupported file type");
    }
  }

  private assertAllowedSize(sizeBytes: number) {
    if (sizeBytes <= 0 || sizeBytes > MAX_ATTACHMENT_BYTES) {
      throw new BadRequestException(`File exceeds max size of ${MAX_ATTACHMENT_BYTES} bytes`);
    }
  }

  private resolveStoragePath(storagePath: string) {
    const absolutePath = path.resolve(this.uploadsDir, storagePath);
    if (!absolutePath.startsWith(this.uploadsDir + path.sep)) {
      throw new BadRequestException("Invalid storage path");
    }
    return absolutePath;
  }

  private async deleteStoredFile(storagePath: string) {
    const absolutePath = this.resolveStoragePath(storagePath);
    await rm(absolutePath, { force: true });
  }
}

function sanitizeFileName(fileName: string) {
  const base = path.basename(fileName).replace(/[^\w.\-() ]+/g, "_").trim();
  return base.length > 0 ? base.slice(0, 255) : "upload.bin";
}
