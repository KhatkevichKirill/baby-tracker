import { Body, Controller, Get, Module, Param, Patch, Post } from "@nestjs/common";
import { type DraftEvent } from "@baby-tracker/shared";
import { DraftService } from "../services/draft.service";
import { EventService } from "../services/event.service";

type CreateDraftDto = DraftEvent & {
  familyId: string;
  childId: string;
  rawInputId: string;
};

type ConfirmDraftDto = {
  createdById: string;
};

@Controller("drafts")
class DraftController {
  constructor(private readonly drafts: DraftService) {}

  @Post()
  create(@Body() payload: CreateDraftDto) {
    return this.drafts.create(payload);
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.drafts.get(id);
  }

  @Patch(":id/confirm")
  confirm(@Param("id") id: string, @Body() payload: ConfirmDraftDto) {
    return this.drafts.confirm(id, payload.createdById);
  }
}

@Module({
  controllers: [DraftController],
  providers: [DraftService, EventService]
})
export class DraftModule {}
