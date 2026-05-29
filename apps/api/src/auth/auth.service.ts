import { ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { PrismaService } from "../services/prisma.service";
import { JwtService } from "./jwt.service";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const setupSchema = loginSchema.extend({
  setupToken: z.string().min(8),
  familyName: z.string().min(1).max(120),
  displayName: z.string().min(1).max(120)
});

function hashPassword(password: string, salt: string) {
  return createHash("sha256").update(`${salt}:${password}`).digest("hex");
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService
  ) {}

  async setup(input: z.infer<typeof setupSchema>) {
    const dto = setupSchema.parse(input);
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

    return this.buildAuthResponse(user.id, user.email, user.displayName, [family.id]);
  }

  async login(input: z.infer<typeof loginSchema>) {
    const dto = loginSchema.parse(input);
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || user.passwordHash !== hashPassword(dto.password, user.passwordSalt)) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const caregivers = await this.prisma.caregiver.findMany({
      where: { userId: user.id },
      include: { family: true }
    });

    return this.buildAuthResponse(
      user.id,
      user.email,
      user.displayName,
      caregivers.map((item) => item.familyId),
      caregivers.map((item) => ({
        id: item.familyId,
        name: item.family.name,
        role: item.role
      }))
    );
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    const caregivers = await this.prisma.caregiver.findMany({
      where: { userId },
      include: { family: true }
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName
      },
      families: caregivers.map((item) => ({
        id: item.familyId,
        name: item.family.name,
        role: item.role
      }))
    };
  }

  async buildBotSession(userId: string, childId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    const child = await this.prisma.child.findUnique({
      where: { id: childId },
      include: { family: true }
    });
    if (!child) {
      throw new NotFoundException("Child not found");
    }

    const caregiver = await this.prisma.caregiver.findFirst({
      where: { userId, familyId: child.familyId }
    });
    if (!caregiver) {
      throw new ForbiddenException("No access to this child");
    }

    const caregivers = await this.prisma.caregiver.findMany({
      where: { userId },
      include: { family: true }
    });
    const familyIds = caregivers.map((item) => item.familyId);

    const auth = this.buildAuthResponse(
      user.id,
      user.email,
      user.displayName,
      familyIds,
      caregivers.map((item) => ({
        id: item.familyId,
        name: item.family.name,
        role: item.role
      }))
    );

    return {
      ...auth,
      childId: child.id,
      childName: child.name
    };
  }

  private buildAuthResponse(
    userId: string,
    email: string,
    displayName: string,
    familyIds: string[],
    families?: { id: string; name: string; role: string }[]
  ) {
    const token = this.jwt.sign({ sub: userId, email, familyIds });
    return {
      token,
      user: { id: userId, email, displayName },
      families: families ?? familyIds.map((id) => ({ id, name: "", role: "admin" }))
    };
  }
}
