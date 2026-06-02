import { Controller, Get, Module, ServiceUnavailableException } from "@nestjs/common";
import { PrismaService } from "../services/prisma.service";
import { Public } from "../auth/public.decorator";

@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  async get() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { ok: true, service: "baby-tracker-api", database: "connected" };
    } catch {
      throw new ServiceUnavailableException({
        ok: false,
        service: "baby-tracker-api",
        database: "disconnected"
      });
    }
  }
}

@Module({
  controllers: [HealthController]
})
export class HealthModule {}
