import { describe, expect, it, vi, beforeEach } from "vitest";
import { ForbiddenException } from "@nestjs/common";
import { EventService } from "./event.service";

describe("EventService", () => {
  const events = {
    transaction: vi.fn((fn) => fn({})),
    create: vi.fn(),
    findWithRelations: vi.fn(),
    findById: vi.fn(),
    findTimeline: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn()
  };
  const audit = { log: vi.fn() };
  const attachments = { purgeEventAttachments: vi.fn().mockResolvedValue(0) };
  const familyAccess = {
    assertChildAccess: vi.fn(),
    assertFamilyAccess: vi.fn(),
    assertEventAccess: vi.fn(),
    assertRawInputForChild: vi.fn()
  };

  let service: EventService;

  beforeEach(() => {
    vi.clearAllMocks();
    events.transaction.mockImplementation((fn) => fn({}));
    events.softDelete.mockResolvedValue(undefined);
    audit.log.mockResolvedValue(undefined);
    attachments.purgeEventAttachments.mockResolvedValue(0);
    service = new EventService(
      events as never,
      audit as never,
      familyAccess as never,
      attachments as never
    );
    familyAccess.assertChildAccess.mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111",
      familyId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
    });
    familyAccess.assertRawInputForChild.mockResolvedValue({
      id: "33333333-3333-4333-8333-333333333333",
      familyId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      childId: "11111111-1111-4111-8111-111111111111"
    });
    events.create.mockResolvedValue({ id: "event-1" });
    events.findWithRelations.mockResolvedValue({
      id: "event-1",
      type: "feeding",
      feedingEvent: { kind: "formula", volumeMl: 120 }
    });
  });

  it("creates structured feeding event with subtype row", async () => {
    const tx = {
      feedingEvent: { create: vi.fn() }
    };
    events.transaction.mockImplementation((fn) => fn(tx));

    await service.create(
      ["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"],
      {
        childId: "11111111-1111-4111-8111-111111111111",
        createdById: "22222222-2222-4222-8222-222222222222",
        type: "feeding",
        occurredAt: "2026-05-29T10:00:00.000Z",
        source: "web",
        details: { kind: "formula", volumeMl: 120 }
      }
    );

    expect(familyAccess.assertChildAccess).toHaveBeenCalledWith(
      ["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"],
      "11111111-1111-4111-8111-111111111111"
    );
    expect(events.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "feeding",
        family: { connect: { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" } }
      }),
      tx
    );
    expect(tx.feedingEvent.create).toHaveBeenCalledWith({
      data: { eventId: "event-1", kind: "formula", volumeMl: 120 }
    });
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: "create", entityType: "event" }),
      tx
    );
  });

  it("creates event with same-child rawInputId", async () => {
    const tx = { feedingEvent: { create: vi.fn() } };
    events.transaction.mockImplementation((fn) => fn(tx));

    await service.create(["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"], {
      childId: "11111111-1111-4111-8111-111111111111",
      createdById: "22222222-2222-4222-8222-222222222222",
      rawInputId: "33333333-3333-4333-8333-333333333333",
      type: "feeding",
      occurredAt: "2026-05-29T10:00:00.000Z",
      source: "telegram",
      details: { kind: "formula", volumeMl: 120 }
    });

    expect(familyAccess.assertRawInputForChild).toHaveBeenCalledWith(
      ["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"],
      "33333333-3333-4333-8333-333333333333",
      {
        id: "11111111-1111-4111-8111-111111111111",
        familyId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
      }
    );
    expect(events.create).toHaveBeenCalledWith(
      expect.objectContaining({
        rawInput: { connect: { id: "33333333-3333-4333-8333-333333333333" } }
      }),
      tx
    );
  });

  it("rejects event when rawInputId belongs to another family", async () => {
    familyAccess.assertRawInputForChild.mockRejectedValue(
      new ForbiddenException("No access to this family")
    );

    await expect(
      service.create(["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"], {
        childId: "11111111-1111-4111-8111-111111111111",
        createdById: "22222222-2222-4222-8222-222222222222",
        rawInputId: "99999999-9999-4999-8999-999999999999",
        type: "feeding",
        occurredAt: "2026-05-29T10:00:00.000Z",
        source: "telegram",
        details: { kind: "formula", volumeMl: 120 }
      })
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(events.transaction).not.toHaveBeenCalled();
  });

  it("scopes timeline lookup to authorized child", async () => {
    events.findTimeline.mockResolvedValue([]);
    await service.timeline(
      ["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"],
      "11111111-1111-4111-8111-111111111111",
      "feeding"
    );
    expect(familyAccess.assertChildAccess).toHaveBeenCalledWith(
      ["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"],
      "11111111-1111-4111-8111-111111111111"
    );
    expect(events.findTimeline).toHaveBeenCalledWith(
      "11111111-1111-4111-8111-111111111111",
      "feeding"
    );
  });

  it("validates doctor visit details on create", async () => {
    const tx = {};
    events.transaction.mockImplementation((fn) => fn(tx));

    await service.create(["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"], {
      childId: "11111111-1111-4111-8111-111111111111",
      createdById: "22222222-2222-4222-8222-222222222222",
      type: "doctor_visit",
      occurredAt: "2026-05-29T10:00:00.000Z",
      source: "web",
      details: { providerName: "Dr. Example", visitType: "routine" }
    });

    expect(events.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: "doctor_visit" }),
      tx
    );
  });

  it("purges attachments after delete transaction succeeds", async () => {
    familyAccess.assertEventAccess.mockResolvedValue({
      id: "event-1",
      familyId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      childId: "11111111-1111-4111-8111-111111111111"
    });
    const callOrder: string[] = [];
    events.transaction.mockImplementation(async (fn) => fn({}));
    events.softDelete.mockImplementation(async () => {
      callOrder.push("softDelete");
    });
    audit.log.mockImplementation(async () => {
      callOrder.push("audit");
    });
    attachments.purgeEventAttachments.mockImplementation(async () => {
      callOrder.push("purge");
      return 1;
    });

    const result = await service.remove(
      ["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"],
      "event-1",
      "22222222-2222-4222-8222-222222222222"
    );

    expect(callOrder).toEqual(["softDelete", "audit", "purge"]);
    expect(events.softDelete).toHaveBeenCalledWith("event-1", {});
    expect(result).toMatchObject({
      id: "event-1",
      deleted: true,
      attachmentCleanup: { status: "ok", purgedCount: 1 }
    });
  });

  it("does not purge attachments when delete transaction fails", async () => {
    familyAccess.assertEventAccess.mockResolvedValue({
      id: "event-1",
      familyId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      childId: "11111111-1111-4111-8111-111111111111"
    });
    events.transaction.mockImplementation(async (fn) => {
      events.softDelete.mockRejectedValue(new Error("transaction failed"));
      await fn({});
    });

    await expect(
      service.remove(
        ["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"],
        "event-1",
        "22222222-2222-4222-8222-222222222222"
      )
    ).rejects.toThrow("transaction failed");

    expect(attachments.purgeEventAttachments).not.toHaveBeenCalled();
  });

  it("returns retryable cleanup error when purge fails after delete", async () => {
    familyAccess.assertEventAccess.mockResolvedValue({
      id: "event-1",
      familyId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      childId: "11111111-1111-4111-8111-111111111111"
    });
    events.transaction.mockImplementation(async (fn) => fn({}));
    attachments.purgeEventAttachments.mockRejectedValue(new Error("disk unavailable"));

    const result = await service.remove(
      ["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"],
      "event-1",
      "22222222-2222-4222-8222-222222222222"
    );

    expect(result).toMatchObject({
      id: "event-1",
      deleted: true,
      attachmentCleanup: {
        status: "failed",
        message: "disk unavailable",
        retryable: true
      }
    });
  });
});
