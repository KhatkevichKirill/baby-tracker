import { Body, Controller, Module, Post } from "@nestjs/common";

@Controller("telegram")
class TelegramController {
  @Post("webhook")
  webhook(@Body() body: unknown) {
    return { ok: true, received: body };
  }
}

@Module({
  controllers: [TelegramController]
})
export class TelegramModule {}
