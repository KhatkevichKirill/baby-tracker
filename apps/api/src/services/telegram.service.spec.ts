import { beforeEach, describe, expect, it, vi } from "vitest";
import { BadRequestException, ConflictException } from "@nestjs/common";
import { TelegramService } from "./telegram.service";

const LINK_CODE = "0123456789ABCDEF0123456789ABCDEF";

const prisma = {
  telegramLinkToken: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn()
  },
  user: {
    findUnique: vi.fn(),
    update: vi.fn()
  },
  caregiver: {
    findFirst: vi.fn(),
    findMany: vi.fn()
  },
  child: {
    findUnique: vi.fn(),
    findFirst: vi.fn()
  },
  $transaction: vi.fn(async (callback: (tx: typeof prisma) => Promise<unknown>) => callback(prisma))
};

const familyAccess = {
  assertChildAccess: vi.fn()
};

const auth = {
  buildBotSession: vi.fn()
};

describe("TelegramService", () => {
  const childId = "11111111-1111-4111-8111-111111111111";
  const service = new TelegramService(prisma as never, familyAccess as never, auth as never);

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.TELEGRAM_BOT_SECRET = "test-bot-secret-value";
  });

  it("rejects invalid bot secret", () => {
    expect(() => service.assertBotSecret("wrong")).toThrow("Invalid bot secret");
  });

  it("creates expiring link token with 128-bit entropy", async () => {
    familyAccess.assertChildAccess.mockResolvedValue({ id: childId, familyId: "family-1" });
    prisma.telegramLinkToken.create.mockImplementation(({ data }: { data: { token: string } }) =>
      Promise.resolve({
        token: data.token,
        childId,
        expiresAt: new Date("2026-05-29T13:00:00.000Z")
      })
    );

    const result = await service.createLinkToken("user-1", ["family-1"], { childId });

    expect(result.code).toHaveLength(32);
    expect(prisma.telegramLinkToken.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          childId,
          createdByUserId: "user-1",
          token: expect.stringMatching(/^[0-9A-F]{32}$/)
        })
      })
    );
  });

  it("redeems valid link code and links telegram user", async () => {
    prisma.telegramLinkToken.findUnique.mockResolvedValue({
      id: "token-1",
      token: LINK_CODE,
      childId: "child-1",
      createdByUserId: "user-1",
      usedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      child: { family: { id: "family-1" } },
      createdBy: { id: "user-1" }
    });
    prisma.user.findUnique.mockResolvedValue(null);
    auth.buildBotSession.mockResolvedValue({
      token: "jwt",
      childId: "child-1",
      childName: "Masha"
    });

    const result = await service.redeemLink({
      code: LINK_CODE.toLowerCase(),
      telegramUserId: "12345"
    });

    expect(result.childId).toBe("child-1");
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { telegramUserId: "12345" }
    });
  });

  it("rejects invalid link code with generic error", async () => {
    prisma.telegramLinkToken.findUnique.mockResolvedValue(null);

    await expect(
      service.redeemLink({ code: LINK_CODE, telegramUserId: "12345" })
    ).rejects.toThrow(new BadRequestException("Invalid or expired link code"));
  });

  it("rejects used link code with generic error", async () => {
    prisma.telegramLinkToken.findUnique.mockResolvedValue({
      id: "token-1",
      token: LINK_CODE,
      childId: "child-1",
      createdByUserId: "user-1",
      usedAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
      child: { family: { id: "family-1" } },
      createdBy: { id: "user-1" }
    });

    await expect(
      service.redeemLink({ code: LINK_CODE, telegramUserId: "12345" })
    ).rejects.toThrow(new BadRequestException("Invalid or expired link code"));
  });

  it("rejects expired link code with generic error", async () => {
    prisma.telegramLinkToken.findUnique.mockResolvedValue({
      id: "token-1",
      token: LINK_CODE,
      childId: "child-1",
      createdByUserId: "user-1",
      usedAt: null,
      expiresAt: new Date(Date.now() - 60_000),
      child: { family: { id: "family-1" } },
      createdBy: { id: "user-1" }
    });

    await expect(
      service.redeemLink({ code: LINK_CODE, telegramUserId: "12345" })
    ).rejects.toThrow(new BadRequestException("Invalid or expired link code"));
  });

  it("rejects when telegram account is already linked to another user", async () => {
    prisma.telegramLinkToken.findUnique.mockResolvedValue({
      id: "token-1",
      token: LINK_CODE,
      childId: "child-1",
      createdByUserId: "user-1",
      usedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      child: { family: { id: "family-1" } },
      createdBy: { id: "user-1" }
    });
    prisma.user.findUnique.mockResolvedValue({ id: "other-user" });

    await expect(
      service.redeemLink({ code: LINK_CODE, telegramUserId: "12345" })
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("returns bot session for linked telegram user", async () => {
    prisma.user.findUnique.mockResolvedValue({ id: "user-1" });
    prisma.telegramLinkToken.findFirst.mockResolvedValue({ childId: "child-1" });
    auth.buildBotSession.mockResolvedValue({
      token: "jwt",
      childId: "child-1",
      childName: "Masha"
    });

    const result = await service.getContext("12345");

    expect(auth.buildBotSession).toHaveBeenCalledWith("user-1", "child-1");
    expect(result.childId).toBe("child-1");
  });
});
