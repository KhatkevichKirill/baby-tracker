import { Body, Controller, Get, Module, Param, Post } from "@nestjs/common";
import { PrismaService } from "../services/prisma.service";

type Child = {
  familyId: string;
  name: string;
  dateOfBirth: string;
  sexAtBirth?: string;
};

@Controller("children")
class ChildController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  create(@Body() payload: Child) {
    return this.prisma.child.create({
      data: {
        familyId: payload.familyId,
        name: payload.name,
        dateOfBirth: new Date(payload.dateOfBirth),
        sexAtBirth: payload.sexAtBirth
      }
    });
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.prisma.child.findUnique({ where: { id } });
  }
}

@Module({
  controllers: [ChildController]
})
export class ChildModule {}
