import { PrismaClient } from "@prisma/client";
import { EventService } from "../src/services/event.service";
import { EventRepository } from "../src/repositories/event.repository";
import { AuditRepository } from "../src/repositories/audit.repository";
import { DraftService } from "../src/services/draft.service";

const prisma = new PrismaClient();

async function main() {
  const events = new EventService(new EventRepository(prisma as never), new AuditRepository(prisma as never));
  const drafts = new DraftService(prisma as never, events);

  const user = await prisma.user.findFirstOrThrow({ where: { email: "demo@baby.local" } });
  const child = await prisma.child.findFirstOrThrow({ where: { name: "Demo Baby" } });

  const rawInput = await prisma.rawInput.create({
    data: {
      familyId: child.familyId,
      childId: child.id,
      source: "telegram",
      text: "Покормили 120 мл смеси в 10:00"
    }
  });

  const draft = await drafts.create({
    familyId: child.familyId,
    childId: child.id,
    rawInputId: rawInput.id,
    type: "feeding",
    occurredAt: "2026-05-29T10:00:00.000Z",
    details: { kind: "formula", volumeMl: 120 },
    confidence: 0.92,
    sourceFragment: "120 мл смеси"
  });

  const confirmed = await drafts.confirm(draft.id, user.id);
  if (!confirmed?.rawInputId || confirmed.rawInputId !== rawInput.id) {
    throw new Error("Confirmed event must keep rawInput link");
  }
  if (!confirmed.fromDraftEvent || confirmed.fromDraftEvent.id !== draft.id) {
    throw new Error("Confirmed event must link back to draft");
  }

  const manual = await events.create({
    familyId: child.familyId,
    childId: child.id,
    createdById: user.id,
    type: "sleep",
    occurredAt: "2026-05-29T12:00:00.000Z",
    source: "web",
    details: {
      startAt: "2026-05-29T11:00:00.000Z",
      endAt: "2026-05-29T12:00:00.000Z",
      quality: "good"
    }
  });

  const updated = await events.update(manual!.id, {
    actorUserId: user.id,
    note: "Updated nap"
  });
  if (updated?.note !== "Updated nap") throw new Error("Update failed");

  await events.remove(manual!.id, user.id);
  const deleted = await events.getById(manual!.id).catch(() => null);
  if (deleted) throw new Error("Soft delete should hide event from getById");

  const timeline = await events.timeline(child.id);
  if (timeline.length < 1) throw new Error("Timeline should contain confirmed event");
  for (let i = 1; i < timeline.length; i += 1) {
    if (timeline[i - 1].occurredAt < timeline[i].occurredAt) {
      throw new Error("Timeline must be sorted by occurredAt desc");
    }
  }

  const auditCount = await prisma.auditLog.count({ where: { entityType: "event" } });
  if (auditCount < 3) throw new Error("Expected audit logs for create/update/delete");

  console.log("Domain model verification passed", {
    timelineCount: timeline.length,
    auditCount,
    confirmedEventId: confirmed.id
  });
}

void main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
