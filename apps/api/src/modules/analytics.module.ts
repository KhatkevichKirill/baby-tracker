import { Controller, Get, Module, Param } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import type { RequestUser } from "../auth/auth.types";
import { AnalyticsService } from "../services/analytics.service";
import { AuthModule } from "./auth.module";

@Controller("analytics")
class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get("daily/:childId")
  daily(@CurrentUser() user: RequestUser, @Param("childId") childId: string) {
    return this.analytics.daily(user.familyIds, childId);
  }

  @Get("weekly/:childId")
  weekly(@CurrentUser() user: RequestUser, @Param("childId") childId: string) {
    return this.analytics.weekly(user.familyIds, childId);
  }
}

@Module({
  imports: [AuthModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService]
})
export class AnalyticsModule {}
