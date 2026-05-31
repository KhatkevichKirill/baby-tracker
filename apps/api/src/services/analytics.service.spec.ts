import { describe, expect, it, vi, beforeEach } from "vitest";
import { ForbiddenException } from "@nestjs/common";
import { AnalyticsService } from "./analytics.service";

describe("AnalyticsService", () => {
  const prisma = {
    event: {
      findMany: vi.fn()
    }
  };
  const familyAccess = {
    assertChildAccess: vi.fn()
  };

  let service: AnalyticsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AnalyticsService(prisma as never, familyAccess as never);
    familyAccess.assertChildAccess.mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111",
      familyId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
    });
  });

  it("scopes daily analytics to authorized child and excludes deleted events in queries", async () => {
    prisma.event.findMany
      .mockResolvedValueOnce([
        {
          id: "feed-1",
          type: "feeding",
          occurredAt: new Date("2026-05-30T08:00:00.000Z"),
          deletedAt: null,
          feedingEvent: { kind: "formula", volumeMl: 100 }
        }
      ])
      .mockResolvedValueOnce([]);

    const result = await service.daily(
      ["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"],
      "11111111-1111-4111-8111-111111111111",
      "2026-05-30"
    );

    expect(familyAccess.assertChildAccess).toHaveBeenCalledWith(
      ["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"],
      "11111111-1111-4111-8111-111111111111"
    );
    expect(prisma.event.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          childId: "11111111-1111-4111-8111-111111111111",
          deletedAt: null,
          type: { not: "sleep" }
        })
      })
    );
    expect(result.feeding.count).toBe(1);
    expect(result.disclaimer).toContain("Not medical advice");
  });

  it("loads overlapping sleep sessions separately from occurredAt filtering", async () => {
    prisma.event.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([
      {
        id: "sleep-1",
        type: "sleep",
        occurredAt: new Date("2026-05-29T22:00:00.000Z"),
        deletedAt: null,
        sleepEvent: {
          startAt: new Date("2026-05-29T22:00:00.000Z"),
          endAt: new Date("2026-05-30T02:00:00.000Z")
        }
      }
    ]);

    const result = await service.daily(
      ["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"],
      "11111111-1111-4111-8111-111111111111",
      "2026-05-30"
    );

    expect(prisma.event.findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({
          type: "sleep",
          sleepEvent: expect.any(Object)
        })
      })
    );
    expect(result.sleep.sessionCount).toBe(1);
    expect(result.sleep.totalMinutes).toBe(120);
  });

  it("rejects unauthorized family access", async () => {
    familyAccess.assertChildAccess.mockRejectedValue(new ForbiddenException("No access to this family"));
    await expect(
      service.daily(["bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"], "11111111-1111-4111-8111-111111111111")
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
