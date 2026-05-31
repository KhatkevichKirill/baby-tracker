import { Body, Controller, Delete, Get, Module, Param, Patch, Post, Query } from "@nestjs/common";
import { z } from "zod";
import {
  createEventInputSchema,
  updateEventInputSchema
} from "@baby-tracker/shared";
import { CurrentUser } from "../auth/current-user.decorator";
import type { RequestUser } from "../auth/auth.types";
import { zodPipe } from "../common/pipes/zod-validation.pipe";
import { AuditRepository } from "../repositories/audit.repository";
import { EventRepository } from "../repositories/event.repository";
import { EventService } from "../services/event.service";
import { AuthModule } from "./auth.module";

const createEventBodySchema = createEventInputSchema.omit({ familyId: true }).extend({
  rawInputId: z.string().uuid().optional()
});

const updateEventBodySchema = updateEventInputSchema;

@Controller("events")
class EventController {
  constructor(private readonly events: EventService) {}

  @Post()
  create(
    @CurrentUser() user: RequestUser,
    @Body(zodPipe(createEventBodySchema)) body: z.infer<typeof createEventBodySchema>
  ) {
    return this.events.create(user.familyIds, {
      ...body,
      createdById: user.userId
    });
  }

  @Get("timeline/:childId")
  timeline(
    @CurrentUser() user: RequestUser,
    @Param("childId") childId: string,
    @Query("type") type?: string
  ) {
    return this.events.timeline(user.familyIds, childId, type);
  }

  @Get(":id")
  getById(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.events.getById(user.familyIds, id);
  }

  @Patch(":id")
  update(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Body(zodPipe(updateEventBodySchema)) body: z.infer<typeof updateEventBodySchema>
  ) {
    return this.events.update(user.familyIds, id, {
      ...body,
      actorUserId: user.userId
    });
  }

  @Delete(":id")
  remove(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.events.remove(user.familyIds, id, user.userId);
  }
}

@Module({
  imports: [AuthModule],
  controllers: [EventController],
  providers: [EventRepository, AuditRepository, EventService],
  exports: [EventService]
})
export class EventModule {}
