import { Controller, Get, Module } from "@nestjs/common";
import { PrismaService } from "../services/prisma.service";
import { Public } from "../auth/public.decorator";

@Controller("health")
class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  async get() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { ok: true, service: "baby-tracker-api", database: "connected" };
    } catch {
      return { ok: false, service: "baby-tracker-api", database: "disconnected" };
    }
  }
}

@Module({
  controllers: [HealthController]
})
export class HealthModule {}
