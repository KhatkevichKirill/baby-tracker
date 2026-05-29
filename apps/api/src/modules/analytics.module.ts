import { Controller, Get, Module, Param } from "@nestjs/common";
import { AnalyticsService } from "../services/analytics.service";

@Controller("analytics")
class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get("daily/:childId")
  daily(@Param("childId") childId: string) {
    return this.analytics.daily(childId);
  }

  @Get("weekly/:childId")
  weekly(@Param("childId") childId: string) {
    return this.analytics.weekly(childId);
  }
}

@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsService]
})
export class AnalyticsModule {}
