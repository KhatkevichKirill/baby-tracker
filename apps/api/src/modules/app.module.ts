import { Module } from "@nestjs/common";
import { AuthModule } from "./auth.module";
import { ChildModule } from "./child.module";
import { EventModule } from "./event.module";
import { DraftModule } from "./draft.module";
import { AnalyticsModule } from "./analytics.module";
import { FileModule } from "./file.module";
import { TelegramModule } from "./telegram.module";
import { ExportModule } from "./export.module";
import { PrismaModule } from "./prisma.module";
import { HealthModule } from "./health.module";
import { RawInputModule } from "./raw-input.module";

@Module({
  imports: [
    PrismaModule,
    HealthModule,
    AuthModule,
    RawInputModule,
    ChildModule,
    EventModule,
    DraftModule,
    AnalyticsModule,
    FileModule,
    TelegramModule,
    ExportModule
  ]
})
export class AppModule {}
