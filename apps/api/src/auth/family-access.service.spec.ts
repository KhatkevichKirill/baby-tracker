import { describe, expect, it, vi, beforeEach } from "vitest";
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { FamilyAccessService } from "./family-access.service";

describe("FamilyAccessService", () => {
  const prisma = {
    child: { findUnique: vi.fn() },
    event: { findFirst: vi.fn() },
    draftEvent: { findUnique: vi.fn() },
    rawInput: { findUnique: vi.fn() },
    eventAttachment: { findUnique: vi.fn() },
    caregiver: { findFirst: vi.fn() }
  };

  let service: FamilyAccessService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new FamilyAccessService(prisma as never);
  });

  it("allows access when family matches", async () => {
    prisma.child.findUnique.mockResolvedValue({ id: "child-1", familyId: "family-1" });
    const child = await service.assertChildAccess(["family-1"], "child-1");
    expect(child.familyId).toBe("family-1");
  });

  it("blocks access to another family child", async () => {
    prisma.child.findUnique.mockResolvedValue({ id: "child-1", familyId: "family-2" });
    await expect(service.assertChildAccess(["family-1"], "child-1")).rejects.toBeInstanceOf(
      ForbiddenException
    );
  });

  it("returns not found for missing child", async () => {
    prisma.child.findUnique.mockResolvedValue(null);
    await expect(service.assertChildAccess(["family-1"], "missing")).rejects.toBeInstanceOf(
      NotFoundException
    );
  });

  it("blocks event access from another family", async () => {
    prisma.event.findFirst.mockResolvedValue({ id: "event-1", familyId: "family-2" });
    await expect(service.assertEventAccess(["family-1"], "event-1")).rejects.toBeInstanceOf(
      ForbiddenException
    );
  });
});
