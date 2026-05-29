import { Body, Controller, Get, Module, Param, Post, Query } from "@nestjs/common";
import { type CreateEventInput } from "@baby-tracker/shared";
import { EventService } from "../services/event.service";

type CreateEventDto = CreateEventInput & {
  createdById: string;
  rawInputId?: string;
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
}

@Module({
  controllers: [EventController],
  providers: [EventService]
})
export class EventModule {}
