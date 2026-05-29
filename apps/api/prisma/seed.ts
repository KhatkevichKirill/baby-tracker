import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_EMAIL = "demo@baby.local";

async function main() {
  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {
      displayName: "Demo Parent"
    },
    create: {
      email: DEMO_EMAIL,
      passwordHash: "demo_hash_replace_in_prod",
      passwordSalt: "demo_salt_replace_in_prod",
      displayName: "Demo Parent"
    }
  });

  let family = await prisma.family.findFirst({
    where: { name: "Demo Family" }
  });

  if (!family) {
    family = await prisma.family.create({
      data: { name: "Demo Family" }
    });
  }

  await prisma.caregiver.upsert({
    where: {
      familyId_userId: {
        familyId: family.id,
        userId: user.id
      }
    },
    update: { role: "admin" },
    create: {
      familyId: family.id,
      userId: user.id,
      role: "admin"
    }
  });

  const existingChild = await prisma.child.findFirst({
    where: { familyId: family.id, name: "Demo Baby" }
  });

  if (!existingChild) {
    await prisma.child.create({
      data: {
        familyId: family.id,
        name: "Demo Baby",
        dateOfBirth: new Date("2026-01-01")
      }
    });
  }

  console.log("Seed complete:", {
    familyId: family.id,
    userId: user.id,
    child: existingChild?.id ?? "(created)"
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
