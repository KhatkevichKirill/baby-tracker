import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { AuthGuard } from "../auth/auth.guard";
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
    AuthModule,
    HealthModule,
    RawInputModule,
    ChildModule,
    EventModule,
    DraftModule,
    AnalyticsModule,
    FileModule,
    TelegramModule,
    ExportModule
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard
    }
  ]
})
export class AppModule {}
