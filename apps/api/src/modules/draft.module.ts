import { Body, Controller, Get, Module, Param, Patch, Post } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import type { RequestUser } from "../auth/auth.types";
import { DraftService } from "../services/draft.service";
import { EventModule } from "./event.module";
import { AuthModule } from "./auth.module";

@Controller("drafts")
class DraftController {
  constructor(private readonly drafts: DraftService) {}

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() body: unknown) {
    return this.drafts.create(user.familyIds, body);
  }

  @Get(":id")
  get(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.drafts.get(user.familyIds, id);
  }

  @Patch(":id/confirm")
  confirm(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.drafts.confirm(user.familyIds, id, user.userId);
  }
}

@Module({
  imports: [EventModule, AuthModule],
  controllers: [DraftController],
  providers: [DraftService]
})
export class DraftModule {}
