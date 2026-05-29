import { Body, Controller, Get, Module, Param, Post } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import type { RequestUser } from "../auth/auth.types";
import { ChildService } from "../services/child.service";
import { AuthModule } from "./auth.module";

@Controller("children")
class ChildController {
  constructor(private readonly children: ChildService) {}

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() body: unknown) {
    return this.children.create(user.userId, user.familyIds, body);
  }

  @Get(":id")
  get(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.children.getById(user.familyIds, id);
  }
}

@Module({
  imports: [AuthModule],
  controllers: [ChildController],
  providers: [ChildService]
})
export class ChildModule {}
