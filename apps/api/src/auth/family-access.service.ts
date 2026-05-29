import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../services/prisma.service";

@Injectable()
export class FamilyAccessService {
  constructor(private readonly prisma: PrismaService) {}

  assertFamilyAccess(familyIds: string[], familyId: string) {
    if (!familyIds.includes(familyId)) {
      throw new ForbiddenException("No access to this family");
    }
  }

  async getPrimaryFamilyId(userId: string) {
    const caregiver = await this.prisma.caregiver.findFirst({
      where: { userId },
      orderBy: { createdAt: "asc" }
    });
    if (!caregiver) {
      throw new ForbiddenException("User is not linked to a family");
    }
    return caregiver.familyId;
  }

  async assertChildAccess(familyIds: string[], childId: string) {
    const child = await this.prisma.child.findUnique({ where: { id: childId } });
    if (!child) {
      throw new NotFoundException("Child not found");
    }
    this.assertFamilyAccess(familyIds, child.familyId);
    return child;
  }

  async assertEventAccess(familyIds: string[], eventId: string) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, deletedAt: null }
    });
    if (!event) {
      throw new NotFoundException("Event not found");
    }
    this.assertFamilyAccess(familyIds, event.familyId);
    return event;
  }

  async assertDraftAccess(familyIds: string[], draftId: string) {
    const draft = await this.prisma.draftEvent.findUnique({ where: { id: draftId } });
    if (!draft) {
      throw new NotFoundException("Draft not found");
    }
    this.assertFamilyAccess(familyIds, draft.familyId);
    return draft;
  }

  async assertRawInputAccess(familyIds: string[], rawInputId: string) {
    const rawInput = await this.prisma.rawInput.findUnique({ where: { id: rawInputId } });
    if (!rawInput) {
      throw new NotFoundException("Raw input not found");
    }
    this.assertFamilyAccess(familyIds, rawInput.familyId);
    return rawInput;
  }

  async assertAttachmentAccess(familyIds: string[], attachmentId: string) {
    const attachment = await this.prisma.eventAttachment.findUnique({ where: { id: attachmentId } });
    if (!attachment) {
      throw new NotFoundException("Attachment not found");
    }
    this.assertFamilyAccess(familyIds, attachment.familyId);
    return attachment;
  }
}
