import { UnauthorizedException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TelegramController } from "../modules/telegram.module";
import { TelegramService } from "./telegram.service";
import { TelegramWebhookService } from "./telegram-webhook.service";

describe("Telegram webhook security", () => {
  const telegram = {
    assertWebhookSecret: vi.fn(),
    createLinkToken: vi.fn(),
    redeemLink: vi.fn(),
    getContext: vi.fn(),
    assertBotSecret: vi.fn()
  };
  const webhookService = {
    handleUpdate: vi.fn()
  };
  const controller = new TelegramController(
    telegram as unknown as TelegramService,
    webhookService as unknown as TelegramWebhookService
  );

  beforeEach(() => {
    vi.clearAllMocks();
    webhookService.handleUpdate.mockResolvedValue({ ok: true });
  });

  it("rejects webhook without secret", () => {
    telegram.assertWebhookSecret.mockImplementation(() => {
      throw new UnauthorizedException("Invalid Telegram webhook secret");
    });

    expect(() => controller.webhook(undefined, { update_id: 1 })).toThrow(
      "Invalid Telegram webhook secret"
    );
    expect(webhookService.handleUpdate).not.toHaveBeenCalled();
  });

  it("rejects webhook with wrong secret", () => {
    telegram.assertWebhookSecret.mockImplementation((secret?: string) => {
      if (secret !== "expected-secret") {
        throw new UnauthorizedException("Invalid Telegram webhook secret");
      }
    });

    expect(() => controller.webhook("wrong-secret", { update_id: 1 })).toThrow(
      "Invalid Telegram webhook secret"
    );
    expect(webhookService.handleUpdate).not.toHaveBeenCalled();
  });

  it("accepts webhook with valid secret", async () => {
    telegram.assertWebhookSecret.mockImplementation((secret?: string) => {
      if (secret !== "expected-secret") {
        throw new UnauthorizedException("Invalid Telegram webhook secret");
      }
    });

    const update = { update_id: 1, message: { text: "hello" } };
    await expect(controller.webhook("expected-secret", update)).resolves.toEqual({ ok: true });
    expect(webhookService.handleUpdate).toHaveBeenCalledWith(update);
  });
});

describe("TelegramService webhook secret", () => {
  const service = new TelegramService({} as never, {} as never, {} as never);

  beforeEach(() => {
    process.env.TELEGRAM_BOT_SECRET = "bot-secret-value-1234";
    delete process.env.TELEGRAM_WEBHOOK_SECRET;
  });

  it("uses TELEGRAM_WEBHOOK_SECRET when set", () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = "dedicated-webhook-secret";
    expect(service.getWebhookSecret()).toBe("dedicated-webhook-secret");
    expect(() => service.assertWebhookSecret("dedicated-webhook-secret")).not.toThrow();
    expect(() => service.assertWebhookSecret("bot-secret-value-1234")).toThrow(
      "Invalid Telegram webhook secret"
    );
  });

  it("falls back to TELEGRAM_BOT_SECRET", () => {
    expect(service.getWebhookSecret()).toBe("bot-secret-value-1234");
    expect(() => service.assertWebhookSecret("bot-secret-value-1234")).not.toThrow();
    expect(() => service.assertWebhookSecret(undefined)).toThrow("Invalid Telegram webhook secret");
    expect(() => service.assertWebhookSecret("wrong")).toThrow("Invalid Telegram webhook secret");
  });
});
