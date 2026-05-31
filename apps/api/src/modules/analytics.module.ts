import { Controller, Get, Module, Param, Query, Res } from "@nestjs/common";
import type { Response } from "express";
import { z } from "zod";
import { analyticsDateSchema } from "@baby-tracker/shared";
import { CurrentUser } from "../auth/current-user.decorator";
import type { RequestUser } from "../auth/auth.types";
import { zodPipe } from "../common/pipes/zod-validation.pipe";
import { AnalyticsService } from "../services/analytics.service";
import { AuthModule } from "./auth.module";

const analyticsQuerySchema = z.object({
  date: analyticsDateSchema.optional(),
  format: z.enum(["json", "text"]).optional()
});

@Controller("analytics")
class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get("daily/:childId")
  async daily(
    @CurrentUser() user: RequestUser,
    @Param("childId") childId: string,
    @Query(zodPipe(analyticsQuerySchema)) query: z.infer<typeof analyticsQuerySchema>,
    @Res({ passthrough: true }) res: Response
  ) {
    if (query.format === "text") {
      const text = await this.analytics.dailyText(user.familyIds, childId, query.date);
      res.type("text/plain; charset=utf-8");
      return text;
    }
    return this.analytics.daily(user.familyIds, childId, query.date);
  }

  @Get("weekly/:childId")
  weekly(
    @CurrentUser() user: RequestUser,
    @Param("childId") childId: string,
    @Query(zodPipe(analyticsQuerySchema.pick({ date: true }))) query: { date?: string }
  ) {
    return this.analytics.weekly(user.familyIds, childId, query.date);
  }
}

@Module({
  imports: [AuthModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService]
})
export class AnalyticsModule {}
