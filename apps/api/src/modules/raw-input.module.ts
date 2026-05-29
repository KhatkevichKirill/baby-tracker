import { Body, Controller, Get, Module, Param, Post } from "@nestjs/common";
import { PrismaService } from "../services/prisma.service";

type CreateRawInputDto = {
  familyId: string;
  childId: string;
  source: "telegram" | "web" | "system";
  text: string;
  telegramChatId?: string;
};

@Controller("raw-inputs")
class RawInputController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  create(@Body() payload: CreateRawInputDto) {
    return this.prisma.rawInput.create({ data: payload });
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.prisma.rawInput.findUnique({
      where: { id },
      include: { draftEvents: true, events: true }
    });
  }
}

@Module({
  controllers: [RawInputController]
})
export class RawInputModule {}
