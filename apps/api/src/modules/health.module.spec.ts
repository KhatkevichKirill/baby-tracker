import { ServiceUnavailableException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HealthController } from "../modules/health.module";

describe("HealthController", () => {
  const prisma = {
    $queryRaw: vi.fn()
  };
  const controller = new HealthController(prisma as never);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns ok when database is connected", async () => {
    prisma.$queryRaw.mockResolvedValue([{ "?column?": 1 }]);

    await expect(controller.get()).resolves.toEqual({
      ok: true,
      service: "baby-tracker-api",
      database: "connected"
    });
  });

  it("returns 503 when database check fails", async () => {
    prisma.$queryRaw.mockRejectedValue(new Error("connection refused"));

    await expect(controller.get()).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(controller.get()).rejects.toMatchObject({
      response: {
        ok: false,
        service: "baby-tracker-api",
        database: "disconnected"
      }
    });
  });
});
