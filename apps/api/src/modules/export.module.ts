import { Controller, Get, Module, Param } from "@nestjs/common";

@Controller("export")
class ExportController {
  @Get("json/:childId")
  exportJson(@Param("childId") childId: string) {
    return { childId, format: "json", url: "/tmp/export.json" };
  }
}

@Module({
  controllers: [ExportController]
})
export class ExportModule {}
