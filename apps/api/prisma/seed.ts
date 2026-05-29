import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const family = await prisma.family.create({
    data: {
      name: "Demo Family"
    }
  });

  const user = await prisma.user.create({
    data: {
      email: "demo@baby.local",
      passwordHash: "demo_hash_replace_in_prod",
      passwordSalt: "demo_salt_replace_in_prod",
      displayName: "Demo Parent"
    }
  });

  await prisma.caregiver.create({
    data: {
      familyId: family.id,
      userId: user.id,
      role: "admin"
    }
  });

  await prisma.child.create({
    data: {
      familyId: family.id,
      name: "Demo Baby",
      dateOfBirth: new Date("2026-01-01")
    }
  });
}

void main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
