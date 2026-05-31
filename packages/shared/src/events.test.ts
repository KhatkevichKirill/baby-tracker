import { describe, expect, it } from "vitest";
import {
  doctorVisitEventDetailsSchema,
  labResultEventDetailsSchema
} from "./events";

describe("medical event details schemas", () => {
  it("accepts doctor visit details", () => {
    const parsed = doctorVisitEventDetailsSchema.parse({
      providerName: "Dr. Example",
      visitType: "routine",
      reason: "Wellness check"
    });
    expect(parsed.providerName).toBe("Dr. Example");
  });

  it("accepts lab result details with values", () => {
    const parsed = labResultEventDetailsSchema.parse({
      testName: "Complete blood count",
      values: [{ name: "Hemoglobin", value: "12.1", unit: "g/dL", flag: "normal" }]
    });
    expect(parsed.values?.[0]?.name).toBe("Hemoglobin");
  });

  it("rejects lab result without test name", () => {
    expect(() => labResultEventDetailsSchema.parse({})).toThrow();
  });
});
