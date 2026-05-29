import { PrismaClient } from "@prisma/client";
import { FamilyAccessService } from "../src/auth/family-access.service";
import { EventService } from "../src/services/event.service";
import { EventRepository } from "../src/repositories/event.repository";
import { AuditRepository } from "../src/repositories/audit.repository";
import { DraftService } from "../src/services/draft.service";

const prisma = new PrismaClient();

async function assertDraftConfirmLinks(
  event: {
    id: string;
    rawInputId: string | null;
    fromDraftEvent: { id: string } | null;
  } | null,
  draftId: string,
  rawInputId: string
) {
  if (!event?.rawInputId || event.rawInputId !== rawInputId) {
    throw new Error("Confirmed event must keep rawInput link");
  }
  if (!event.fromDraftEvent || event.fromDraftEvent.id !== draftId) {
    throw new Error("Confirmed event must link back to draft");
  }
}

async function main() {
  const familyAccess = new FamilyAccessService(prisma as never);
  const events = new EventService(
    new EventRepository(prisma as never),
    new AuditRepository(prisma as never),
    familyAccess
  );
  const drafts = new DraftService(prisma as never, events, familyAccess);

  const user = await prisma.user.findFirstOrThrow({ where: { email: "demo@baby.local" } });
  const child = await prisma.child.findFirstOrThrow({ where: { name: "Demo Baby" } });
  const familyIds = [child.familyId];

  const rawInput = await prisma.rawInput.create({
    data: {
      familyId: child.familyId,
      childId: child.id,
      source: "telegram",
      text: "Покормили 120 мл смеси в 10:00"
    }
  });

  const draft = await drafts.create(familyIds, {
    childId: child.id,
    rawInputId: rawInput.id,
    type: "feeding",
    occurredAt: "2026-05-29T10:00:00.000Z",
    details: { kind: "formula", volumeMl: 120 },
    confidence: 0.92,
    sourceFragment: "120 мл смеси"
  });

  const confirmed = await drafts.confirm(familyIds, draft.id, user.id);
  await assertDraftConfirmLinks(confirmed, draft.id, rawInput.id);

  const repeated = await drafts.confirm(familyIds, draft.id, user.id);
  if (!repeated || repeated.id !== confirmed!.id) {
    throw new Error("Repeated draft.confirm must return the same final event");
  }

  const concurrentRawInput = await prisma.rawInput.create({
    data: {
      familyId: child.familyId,
      childId: child.id,
      source: "telegram",
      text: "Concurrent confirm test"
    }
  });

  const concurrentDraft = await drafts.create(familyIds, {
    childId: child.id,
    rawInputId: concurrentRawInput.id,
    type: "feeding",
    occurredAt: "2026-05-29T11:00:00.000Z",
    details: { kind: "formula", volumeMl: 90 },
    confidence: 0.88,
    sourceFragment: "90 мл"
  });

  const [firstConcurrent, secondConcurrent] = await Promise.all([
    drafts.confirm(familyIds, concurrentDraft.id, user.id),
    drafts.confirm(familyIds, concurrentDraft.id, user.id)
  ]);

  if (!firstConcurrent || !secondConcurrent || firstConcurrent.id !== secondConcurrent.id) {
    throw new Error("Concurrent draft.confirm calls must return the same final event");
  }

  await assertDraftConfirmLinks(firstConcurrent, concurrentDraft.id, concurrentRawInput.id);

  const linkedEventCount = await prisma.event.count({
    where: { fromDraftEvent: { id: concurrentDraft.id } }
  });
  if (linkedEventCount !== 1) {
    throw new Error(`Expected exactly one final event for draft, got ${linkedEventCount}`);
  }

  const manual = await events.create(familyIds, {
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

  const updated = await events.update(familyIds, manual!.id, {
    actorUserId: user.id,
    note: "Updated nap"
  });
  if (updated?.note !== "Updated nap") throw new Error("Update failed");

  const feeding = await events.create(familyIds, {
    childId: child.id,
    createdById: user.id,
    type: "feeding",
    occurredAt: "2026-05-29T13:00:00.000Z",
    source: "web",
    details: { kind: "formula", volumeMl: 100 }
  });

  const mergedUpdate = await events.update(familyIds, feeding!.id, {
    actorUserId: user.id,
    details: { volumeMl: 150 }
  });
  const mergedDetails = mergedUpdate?.detailsJson as Record<string, unknown> | null;
  if (mergedDetails?.kind !== "formula" || mergedDetails?.volumeMl !== 150) {
    throw new Error("Partial details update must merge with existing detailsJson");
  }

  await events.remove(familyIds, manual!.id, user.id);
  const deleted = await events.getById(familyIds, manual!.id).catch(() => null);
  if (deleted) throw new Error("Soft delete should hide event from getById");

  const timeline = await events.timeline(familyIds, child.id);
  if (timeline.length < 2) throw new Error("Timeline should contain confirmed events");
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
    confirmedEventId: confirmed!.id,
    concurrentEventId: firstConcurrent.id
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
