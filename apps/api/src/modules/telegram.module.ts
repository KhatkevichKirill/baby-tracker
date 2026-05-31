import { BadRequestException, Body, Controller, Get, Headers, Module, Post } from "@nestjs/common";
import { Public } from "../auth/public.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import type { RequestUser } from "../auth/auth.types";
import { TelegramService } from "../services/telegram.service";
import { TelegramWebhookService } from "../services/telegram-webhook.service";
import { AuthModule } from "./auth.module";
import { PrismaModule } from "./prisma.module";

@Controller("telegram")
export class TelegramController {
  constructor(
    private readonly telegram: TelegramService,
    private readonly webhookService: TelegramWebhookService
  ) {}

  @Post("link-tokens")
  createLinkToken(@CurrentUser() user: RequestUser, @Body() body: unknown) {
    return this.telegram.createLinkToken(user.userId, user.familyIds, body);
  }

  @Public()
  @Post("link")
  redeemLink(@Body() body: unknown) {
    return this.telegram.redeemLink(body);
  }

  @Public()
  @Get("context")
  getContext(
    @Headers("x-bot-secret") botSecret: string | undefined,
    @Headers("x-telegram-user-id") telegramUserId: string | undefined
  ) {
    this.telegram.assertBotSecret(botSecret);
    if (!telegramUserId) {
      throw new BadRequestException("x-telegram-user-id header is required");
    }
    return this.telegram.getContext(telegramUserId);
  }

  @Public()
  @Post("webhook")
  webhook(
    @Headers("x-telegram-bot-api-secret-token") webhookSecret: string | undefined,
    @Body() body: unknown
  ) {
    this.telegram.assertWebhookSecret(webhookSecret);
    return this.webhookService.handleUpdate(body);
  }
}

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [TelegramController],
  providers: [TelegramService, TelegramWebhookService],
  exports: [TelegramService]
})
export class TelegramModule {}
