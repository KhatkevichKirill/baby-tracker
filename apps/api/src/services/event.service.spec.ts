import { describe, expect, it, vi, beforeEach } from "vitest";
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
  const familyAccess = {
    assertChildAccess: vi.fn(),
    assertFamilyAccess: vi.fn(),
    assertEventAccess: vi.fn()
  };

  let service: EventService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new EventService(events as never, audit as never, familyAccess as never);
    familyAccess.assertChildAccess.mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111",
      familyId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
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
});
