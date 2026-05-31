import { Body, Controller, Get, Module, Param, Post } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import type { RequestUser } from "../auth/auth.types";
import { RawInputService } from "../services/raw-input.service";
import { AuthModule } from "./auth.module";

@Controller("raw-inputs")
class RawInputController {
  constructor(private readonly rawInputs: RawInputService) {}

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() body: unknown) {
    return this.rawInputs.create(user.familyIds, body);
  }

  @Get(":id")
  get(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.rawInputs.getById(user.familyIds, id);
  }
}

@Module({
  imports: [AuthModule],
  controllers: [RawInputController],
  providers: [RawInputService]
})
export class RawInputModule {}
