import { Controller, Get, Module } from "@nestjs/common";

@Controller("health")
class HealthController {
  @Get()
  get() {
    return { ok: true, service: "baby-tracker-api" };
  }
}

@Module({
  controllers: [HealthController]
})
export class HealthModule {}
