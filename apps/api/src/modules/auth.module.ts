import { Body, Controller, Get, Module, Post } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { JwtService } from "../auth/jwt.service";
import { FamilyAccessService } from "../auth/family-access.service";
import { Public } from "../auth/public.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import type { RequestUser } from "../auth/auth.types";

@Controller("auth")
class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post("setup")
  setup(@Body() body: unknown) {
    return this.auth.setup(body as never);
  }

  @Public()
  @Post("login")
  login(@Body() body: unknown) {
    return this.auth.login(body as never);
  }

  @Get("me")
  me(@CurrentUser() user: RequestUser) {
    return this.auth.me(user.userId);
  }
}

@Module({
  controllers: [AuthController],
  providers: [AuthService, JwtService, FamilyAccessService],
  exports: [AuthService, JwtService, FamilyAccessService]
})
export class AuthModule {}
