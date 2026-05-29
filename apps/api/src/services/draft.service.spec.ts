import { describe, expect, it, vi, beforeEach } from "vitest";
import { NotFoundException } from "@nestjs/common";
import { DraftService } from "./draft.service";

describe("DraftService", () => {
  const prisma = {
    draftEvent: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn()
    },
    $transaction: vi.fn(),
    event: { findUnique: vi.fn() }
  };
  const eventService = { createInTransaction: vi.fn() };
  const familyAccess = {
    assertChildAccess: vi.fn(),
    assertRawInputAccess: vi.fn(),
    assertDraftAccess: vi.fn()
  };

  let service: DraftService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new DraftService(prisma as never, eventService as never, familyAccess as never);
    familyAccess.assertChildAccess.mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111",
      familyId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
    });
    familyAccess.assertRawInputAccess.mockResolvedValue({
      id: "33333333-3333-4333-8333-333333333333",
      familyId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
    });
    familyAccess.assertDraftAccess.mockResolvedValue({
      id: "44444444-4444-4444-8444-444444444444",
      familyId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
    });
  });

  it("creates draft only after validation", async () => {
    prisma.draftEvent.create.mockResolvedValue({ id: "draft-1" });
    await service.create(["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"], {
      childId: "11111111-1111-4111-8111-111111111111",
      rawInputId: "33333333-3333-4333-8333-333333333333",
      type: "feeding",
      details: { kind: "formula", volumeMl: 90 },
      confidence: 0.9,
      sourceFragment: "90 ml"
    });
    expect(prisma.draftEvent.create).toHaveBeenCalled();
  });

  it("confirm creates final event once", async () => {
    const tx = {
      $queryRaw: vi.fn(),
      draftEvent: {
        findUnique: vi.fn().mockResolvedValue({
          id: "44444444-4444-4444-8444-444444444444",
          familyId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          childId: "11111111-1111-4111-8111-111111111111",
          rawInputId: "33333333-3333-4333-8333-333333333333",
          type: "feeding",
          occurredAt: new Date("2026-05-29T10:00:00.000Z"),
          createdAt: new Date("2026-05-29T10:00:00.000Z"),
          detailsJson: { kind: "formula", volumeMl: 90 },
          sourceFragment: "90 ml",
          isConfirmed: false,
          rawInput: { source: "telegram" }
        }),
        update: vi.fn()
      },
      event: { findUnique: vi.fn().mockResolvedValue({ id: "event-1" }) }
    };
    prisma.$transaction.mockImplementation((fn) => fn(tx));
    eventService.createInTransaction.mockResolvedValue({ id: "event-1" });

    const result = await service.confirm(
      ["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"],
      "44444444-4444-4444-8444-444444444444",
      "22222222-2222-4222-8222-222222222222"
    );
    expect(eventService.createInTransaction).toHaveBeenCalled();
    expect(tx.draftEvent.update).toHaveBeenCalledWith({
      where: { id: "44444444-4444-4444-8444-444444444444" },
      data: { isConfirmed: true, confirmedEventId: "event-1" }
    });
    expect(result).toEqual({ id: "event-1" });
  });

  it("throws when draft is missing on confirm", async () => {
    const tx = {
      $queryRaw: vi.fn(),
      draftEvent: { findUnique: vi.fn().mockResolvedValue(null) }
    };
    prisma.$transaction.mockImplementation((fn) => fn(tx));
    await expect(
      service.confirm(["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"], "missing", "user-1")
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
