import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException
} from "@nestjs/common";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { FamilyAccessService } from "../auth/family-access.service";
import { AuthService } from "../auth/auth.service";
import { PrismaService } from "./prisma.service";

const LINK_TOKEN_TTL_MS = 15 * 60 * 1000;

const createLinkTokenSchema = z.object({
  childId: z.string().uuid()
});

const LINK_CODE_LENGTH = 32;

const redeemLinkSchema = z.object({
  code: z.string().min(LINK_CODE_LENGTH).max(LINK_CODE_LENGTH),
  telegramUserId: z.string().min(1).max(64),
  telegramChatId: z.string().min(1).max(64).optional()
});

const INVALID_LINK_CODE_MESSAGE = "Invalid or expired link code";

@Injectable()
export class TelegramService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly familyAccess: FamilyAccessService,
    private readonly auth: AuthService
  ) {}

  assertBotSecret(secret: string | undefined) {
    const expected = process.env.TELEGRAM_BOT_SECRET;
    if (!expected || secret !== expected) {
      throw new UnauthorizedException("Invalid bot secret");
    }
  }

  getWebhookSecret() {
    return process.env.TELEGRAM_WEBHOOK_SECRET ?? process.env.TELEGRAM_BOT_SECRET;
  }

  assertWebhookSecret(secret: string | undefined) {
    const expected = this.getWebhookSecret();
    if (!expected || secret !== expected) {
      throw new UnauthorizedException("Invalid Telegram webhook secret");
    }
  }

  async createLinkToken(userId: string, familyIds: string[], input: unknown) {
    const payload = createLinkTokenSchema.parse(input);
    await this.familyAccess.assertChildAccess(familyIds, payload.childId);

    const code = randomBytes(16).toString("hex").toUpperCase();
    const expiresAt = new Date(Date.now() + LINK_TOKEN_TTL_MS);

    const token = await this.prisma.telegramLinkToken.create({
      data: {
        childId: payload.childId,
        createdByUserId: userId,
        token: code,
        expiresAt
      }
    });

    return {
      code: token.token,
      childId: token.childId,
      expiresAt: token.expiresAt.toISOString()
    };
  }

  async redeemLink(input: unknown) {
    const payload = redeemLinkSchema.parse(input);
    const code = payload.code.trim().toUpperCase();

    const linkToken = await this.prisma.telegramLinkToken.findUnique({
      where: { token: code },
      include: {
        child: { include: { family: true } },
        createdBy: true
      }
    });

    if (!linkToken || linkToken.usedAt || linkToken.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException(INVALID_LINK_CODE_MESSAGE);
    }

    const existingTelegramUser = await this.prisma.user.findUnique({
      where: { telegramUserId: payload.telegramUserId }
    });
    if (existingTelegramUser && existingTelegramUser.id !== linkToken.createdByUserId) {
      throw new ConflictException("Telegram account already linked to another user");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: linkToken.createdByUserId },
        data: { telegramUserId: payload.telegramUserId }
      });
      await tx.telegramLinkToken.update({
        where: { id: linkToken.id },
        data: { usedAt: new Date() }
      });
    });

    return this.buildBotContext(linkToken.createdByUserId, linkToken.childId);
  }

  async getContext(telegramUserId: string) {
    const user = await this.prisma.user.findUnique({
      where: { telegramUserId }
    });
    if (!user) {
      throw new NotFoundException("Telegram account is not linked");
    }

    const childId = await this.resolveActiveChildId(user.id);
    return this.buildBotContext(user.id, childId);
  }

  private async resolveActiveChildId(userId: string) {
    const latestLink = await this.prisma.telegramLinkToken.findFirst({
      where: {
        createdByUserId: userId,
        usedAt: { not: null }
      },
      orderBy: { usedAt: "desc" }
    });
    if (latestLink) {
      return latestLink.childId;
    }

    const caregiver = await this.prisma.caregiver.findFirst({
      where: { userId },
      orderBy: { createdAt: "asc" }
    });
    if (!caregiver) {
      throw new ForbiddenException("User is not linked to a family");
    }

    const child = await this.prisma.child.findFirst({
      where: { familyId: caregiver.familyId },
      orderBy: { createdAt: "asc" }
    });
    if (!child) {
      throw new NotFoundException("No child configured for this family");
    }
    return child.id;
  }

  private async buildBotContext(userId: string, childId: string) {
    const session = await this.auth.buildBotSession(userId, childId);
    return session;
  }
}
