import { z } from "zod";

export const eventTypeSchema = z.enum([
  "feeding",
  "sleep",
  "diaper",
  "symptom",
  "medication",
  "measurement",
  "doctor_visit",
  "lab_result",
  "note"
]);

export const sourceSchema = z.enum(["telegram", "web", "system"]);

export const baseEventSchema = z.object({
  familyId: z.string().uuid(),
  childId: z.string().uuid(),
  occurredAt: z.string().datetime(),
  source: sourceSchema,
  note: z.string().max(2000).optional()
});

export const feedingEventDetailsSchema = z.object({
  kind: z.enum(["breast", "formula", "expressed", "solid"]),
  volumeMl: z.number().positive().optional(),
  durationMin: z.number().positive().optional(),
  breastSide: z.enum(["left", "right", "both"]).optional()
});

export const sleepEventDetailsSchema = z.object({
  startAt: z.string().datetime(),
  endAt: z.string().datetime().optional(),
  quality: z.enum(["good", "normal", "poor"]).optional(),
  location: z.string().max(120).optional()
});

export const diaperEventDetailsSchema = z.object({
  kind: z.enum(["stool", "urine", "mixed"]),
  color: z.string().max(80).optional(),
  consistency: z.string().max(120).optional()
});

export const symptomEventDetailsSchema = z.object({
  symptomType: z.string().max(120),
  temperatureC: z.number().min(30).max(45).optional(),
  intensity: z.number().int().min(1).max(10).optional()
});

export const measurementEventDetailsSchema = z.object({
  weightKg: z.number().positive().optional(),
  heightCm: z.number().positive().optional(),
  headCircumferenceCm: z.number().positive().optional(),
  temperatureC: z.number().min(30).max(45).optional()
});

export const doctorVisitEventDetailsSchema = z.object({
  providerName: z.string().max(200).optional(),
  facility: z.string().max(200).optional(),
  visitType: z.enum(["routine", "sick", "follow_up", "emergency", "other"]).optional(),
  reason: z.string().max(500).optional(),
  diagnosis: z.string().max(500).optional(),
  followUpAt: z.string().datetime().optional(),
  attachmentIds: z.array(z.string().uuid()).max(20).optional()
});

export const labResultEventDetailsSchema = z.object({
  testName: z.string().max(200),
  labName: z.string().max(200).optional(),
  panelName: z.string().max(200).optional(),
  resultSummary: z.string().max(2000).optional(),
  values: z
    .array(
      z.object({
        name: z.string().max(120),
        value: z.string().max(120),
        unit: z.string().max(40).optional(),
        referenceRange: z.string().max(80).optional(),
        flag: z.enum(["normal", "low", "high", "critical"]).optional()
      })
    )
    .max(50)
    .optional(),
  collectedAt: z.string().datetime().optional(),
  reportedAt: z.string().datetime().optional(),
  attachmentIds: z.array(z.string().uuid()).max(20).optional()
});

export const createEventInputSchema = baseEventSchema.extend({
  type: eventTypeSchema,
  details: z.record(z.any()).default({})
});

export const updateEventInputSchema = z.object({
  occurredAt: z.string().datetime().optional(),
  note: z.string().max(2000).nullable().optional(),
  details: z.record(z.any()).optional()
});

export const draftEventSchema = z.object({
  type: eventTypeSchema,
  occurredAt: z.string().datetime().optional(),
  details: z.record(z.any()),
  confidence: z.number().min(0).max(1),
  sourceFragment: z.string().min(1)
});

export type CreateEventInput = z.infer<typeof createEventInputSchema>;
export type UpdateEventInput = z.infer<typeof updateEventInputSchema>;
export type DraftEvent = z.infer<typeof draftEventSchema>;
