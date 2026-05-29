import {
  Body,
  Controller,
  Delete,
  Get,
  Module,
  Param,
  Patch,
  Post,
  Query
} from "@nestjs/common";
import { type CreateEventInput } from "@baby-tracker/shared";
import { AuditRepository } from "../repositories/audit.repository";
import { EventRepository } from "../repositories/event.repository";
import { EventService } from "../services/event.service";

type CreateEventDto = CreateEventInput & {
  createdById: string;
  rawInputId?: string;
};

type UpdateEventDto = {
  occurredAt?: string;
  note?: string | null;
  details?: Record<string, unknown>;
  actorUserId: string;
};

type DeleteEventDto = {
  actorUserId: string;
};

@Controller("events")
class EventController {
  constructor(private readonly events: EventService) {}

  @Post()
  create(@Body() payload: CreateEventDto) {
    return this.events.create(payload);
  }

  @Get("timeline/:childId")
  timeline(@Param("childId") childId: string, @Query("type") type?: string) {
    return this.events.timeline(childId, type);
  }

  @Get(":id")
  getById(@Param("id") id: string) {
    return this.events.getById(id);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() payload: UpdateEventDto) {
    return this.events.update(id, payload);
  }

  @Delete(":id")
  remove(@Param("id") id: string, @Body() payload: DeleteEventDto) {
    return this.events.remove(id, payload.actorUserId);
  }
}

@Module({
  controllers: [EventController],
  providers: [EventRepository, AuditRepository, EventService],
  exports: [EventService]
})
export class EventModule {}
