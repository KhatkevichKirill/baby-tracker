import { Body, Controller, Module, Post } from "@nestjs/common";
import { Public } from "../auth/public.decorator";

@Controller("telegram")
class TelegramController {
  @Public()
  @Post("webhook")
  webhook(@Body() body: unknown) {
    return { ok: true, received: body };
  }
}

@Module({
  controllers: [TelegramController]
})
export class TelegramModule {}
