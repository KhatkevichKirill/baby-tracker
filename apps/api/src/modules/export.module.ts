import { Controller, Get, Module, Param } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import type { RequestUser } from "../auth/auth.types";
import { FamilyAccessService } from "../auth/family-access.service";
import { PrismaService } from "../services/prisma.service";
import { eventInclude } from "../repositories/event.repository";
import { AuthModule } from "./auth.module";

@Controller("export")
class ExportController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly familyAccess: FamilyAccessService
  ) {}

  @Get("json/:childId")
  async exportJson(@CurrentUser() user: RequestUser, @Param("childId") childId: string) {
    await this.familyAccess.assertChildAccess(user.familyIds, childId);

    const [child, events] = await Promise.all([
      this.prisma.child.findUnique({ where: { id: childId } }),
      this.prisma.event.findMany({
        where: { childId, deletedAt: null },
        orderBy: { occurredAt: "desc" },
        include: eventInclude
      })
    ]);

    return {
      childId,
      format: "json",
      exportedAt: new Date().toISOString(),
      child,
      events
    };
  }
}

@Module({
  imports: [AuthModule],
  controllers: [ExportController]
})
export class ExportModule {}
