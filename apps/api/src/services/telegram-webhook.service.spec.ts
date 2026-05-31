import { UnauthorizedException, BadRequestException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TelegramController } from "../modules/telegram.module";
import { TelegramService } from "./telegram.service";
import { TelegramWebhookService } from "./telegram-webhook.service";

describe("Telegram link redemption security", () => {
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
    telegram.redeemLink.mockResolvedValue({ token: "jwt", childId: "child-1" });
  });

  it("rejects link redemption without bot secret", () => {
    telegram.assertBotSecret.mockImplementation(() => {
      throw new UnauthorizedException("Invalid bot secret");
    });

    expect(() => controller.redeemLink(undefined, { code: "abc", telegramUserId: "1" })).toThrow(
      "Invalid bot secret"
    );
    expect(telegram.redeemLink).not.toHaveBeenCalled();
  });

  it("rejects link redemption with wrong bot secret", () => {
    telegram.assertBotSecret.mockImplementation((secret?: string) => {
      if (secret !== "expected-bot-secret") {
        throw new UnauthorizedException("Invalid bot secret");
      }
    });

    expect(() =>
      controller.redeemLink("wrong-secret", { code: "abc", telegramUserId: "1" })
    ).toThrow("Invalid bot secret");
    expect(telegram.redeemLink).not.toHaveBeenCalled();
  });

  it("accepts link redemption with valid bot secret", async () => {
    telegram.assertBotSecret.mockImplementation((secret?: string) => {
      if (secret !== "expected-bot-secret") {
        throw new UnauthorizedException("Invalid bot secret");
      }
    });

    const body = {
      code: "0123456789ABCDEF0123456789ABCDEF",
      telegramUserId: "12345"
    };
    await expect(controller.redeemLink("expected-bot-secret", body)).resolves.toEqual({
      token: "jwt",
      childId: "child-1"
    });
    expect(telegram.redeemLink).toHaveBeenCalledWith(body);
  });
});

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
