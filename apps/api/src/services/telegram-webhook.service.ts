import { Injectable, OnModuleInit } from "@nestjs/common";
import { createBot } from "@baby-tracker/bot";

@Injectable()
export class TelegramWebhookService implements OnModuleInit {
  private bot: ReturnType<typeof createBot> | null = null;

  onModuleInit() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const botSecret = process.env.TELEGRAM_BOT_SECRET;
    const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:3001";

    if (!token || !botSecret) {
      return;
    }

    this.bot = createBot({
      token,
      apiBaseUrl,
      botSecret
    });
  }

  async handleUpdate(update: unknown) {
    if (!this.bot) {
      return { ok: false, reason: "Telegram bot is not configured" };
    }

    await this.bot.handleUpdate(update as never);
    return { ok: true };
  }
}
