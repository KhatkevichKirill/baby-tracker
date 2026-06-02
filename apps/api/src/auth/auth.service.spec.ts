import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import bcrypt from "bcrypt";
import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthService } from "./auth.service";

const prisma = {
  user: {
    count: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn()
  },
  family: {
    create: vi.fn()
  },
  caregiver: {
    create: vi.fn(),
    findMany: vi.fn()
  }
};

const jwt = {
  sign: vi.fn()
};

describe("AuthService", () => {
  const service = new AuthService(prisma as never, jwt as never);

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SETUP_TOKEN = "setup-token-value";
    jwt.sign.mockReturnValue("signed-jwt");
  });

  it("logs in with bcrypt password hash", async () => {
    const password = "secure-password";
    const passwordHash = await bcrypt.hash(password, 12);
    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "parent@example.com",
      displayName: "Parent",
      passwordHash,
      passwordSalt: "legacy-salt"
    });
    prisma.caregiver.findMany.mockResolvedValue([
      { familyId: "family-1", role: "admin", family: { name: "Family" } }
    ]);

    const result = await service.login({
      email: "parent@example.com",
      password
    });

    expect(result.token).toBe("signed-jwt");
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("rejects login with wrong password", async () => {
    const passwordHash = await bcrypt.hash("correct-password", 12);
    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "parent@example.com",
      displayName: "Parent",
      passwordHash,
      passwordSalt: "legacy-salt"
    });

    await expect(
      service.login({
        email: "parent@example.com",
        password: "wrong-password"
      })
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("accepts legacy sha256 password and rehashes to bcrypt", async () => {
    const password = "legacy-password";
    const passwordSalt = "legacy-salt";
    const passwordHash = createHash("sha256").update(`${passwordSalt}:${password}`).digest("hex");
    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "parent@example.com",
      displayName: "Parent",
      passwordHash,
      passwordSalt
    });
    prisma.user.update.mockResolvedValue({});
    prisma.caregiver.findMany.mockResolvedValue([
      { familyId: "family-1", role: "admin", family: { name: "Family" } }
    ]);

    await service.login({
      email: "parent@example.com",
      password
    });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: {
        passwordHash: expect.stringMatching(/^\$2[aby]\$/)
      }
    });
  });

  it("stores bcrypt hash during setup", async () => {
    prisma.user.count.mockResolvedValue(0);
    prisma.family.create.mockResolvedValue({ id: "family-1" });
    prisma.user.create.mockImplementation(({ data }: { data: { passwordHash: string } }) =>
      Promise.resolve({
        id: "user-1",
        email: "parent@example.com",
        displayName: "Parent",
        passwordHash: data.passwordHash
      })
    );
    prisma.caregiver.create.mockResolvedValue({});

    await service.setup({
      email: "parent@example.com",
      password: "secure-password",
      setupToken: "setup-token-value",
      familyName: "Family",
      displayName: "Parent"
    });

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        passwordHash: expect.stringMatching(/^\$2[aby]\$/)
      })
    });
  });

  it("rejects setup when token is invalid", async () => {
    await expect(
      service.setup({
        email: "parent@example.com",
        password: "secure-password",
        setupToken: "wrong-token",
        familyName: "Family",
        displayName: "Parent"
      })
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
