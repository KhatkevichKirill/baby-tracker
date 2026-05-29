import { Body, Controller, ForbiddenException, Module, Post, UnauthorizedException } from "@nestjs/common";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { PrismaService } from "../services/prisma.service";

class LoginDto {
  email!: string;
  password!: string;
}

class SetupDto extends LoginDto {
  setupToken!: string;
  familyName!: string;
  displayName!: string;
}

function hashPassword(password: string, salt: string) {
  return createHash("sha256").update(`${salt}:${password}`).digest("hex");
}

@Controller("auth")
class AuthController {
  constructor(private readonly prisma: PrismaService) {}

  @Post("setup")
  async setup(@Body() dto: SetupDto) {
    if (dto.setupToken !== process.env.SETUP_TOKEN) {
      throw new ForbiddenException("Invalid setup token");
    }

    const existingUsers = await this.prisma.user.count();
    if (existingUsers > 0) {
      throw new ForbiddenException("Setup already completed");
    }

    const family = await this.prisma.family.create({ data: { name: dto.familyName } });
    const passwordSalt = randomBytes(16).toString("hex");
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        displayName: dto.displayName,
        passwordSalt,
        passwordHash: hashPassword(dto.password, passwordSalt)
      }
    });
    await this.prisma.caregiver.create({
      data: {
        familyId: family.id,
        userId: user.id,
        role: "admin"
      }
    });
    return { familyId: family.id, userId: user.id };
  }

  @Post("login")
  async login(@Body() dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || user.passwordHash !== hashPassword(dto.password, user.passwordSalt)) {
      throw new UnauthorizedException("Invalid credentials");
    }
    return { token: randomUUID(), userId: user.id, email: dto.email };
  }
}

@Module({
  controllers: [AuthController]
})
export class AuthModule {}
