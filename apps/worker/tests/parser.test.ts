import { describe, expect, it } from "vitest";
import { draftEventSchema } from "@baby-tracker/shared";
import { parseAndValidateDraftsJson } from "../src/llm/json-parser";
import { MockLlmProvider, RuleBasedRuProvider } from "../src/llm/provider";
import {
  CONFIDENCE_CONFIRM_THRESHOLD,
  type LlmProvider,
  type LlmProviderInput,
  type LlmParseResult
} from "../src/parser/types";
import {
  createFallbackNoteDraft,
  parseRawInputToDrafts,
  parseViaProvider
} from "../src/parser/parse-message";
import { buildParseRuPrompt } from "../src/templates/parse-ru.template";

const RAW_INPUT_ID = "33333333-3333-4333-8333-333333333333";

function expectAllRequireConfirmation(
  drafts: Array<{ requiresConfirmation: boolean }>
): void {
  for (const draft of drafts) {
    expect(draft.requiresConfirmation).toBe(true);
  }
}

class StaticJsonLlmProvider implements LlmProvider {
  constructor(private readonly payload: string) {}

  async parseRawMessage(): Promise<LlmParseResult> {
    const parsed = parseAndValidateDraftsJson(this.payload);
    if (!parsed.ok) {
      return { drafts: [], metadata: { fallbackReason: parsed.reason } };
    }
    return { drafts: parsed.drafts };
  }
}

class EmptyLlmProvider implements LlmProvider {
  async parseRawMessage(): Promise<LlmParseResult> {
    return { drafts: [], metadata: { fallbackReason: "empty_llm_response" } };
  }
}

class ThrowingLlmProvider implements LlmProvider {
  async parseRawMessage(_input: LlmProviderInput): Promise<LlmParseResult> {
    throw new Error("provider unavailable");
  }
}

describe("parseAndValidateDraftsJson", () => {
  it("parses fenced JSON array", () => {
    const result = parseAndValidateDraftsJson(`
\`\`\`json
[
  {
    "type": "note",
    "details": { "text": "ok" },
    "confidence": 0.9,
    "sourceFragment": "ok"
  }
]
\`\`\`
`);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.drafts).toHaveLength(1);
    }
  });

  it("rejects invalid JSON", () => {
    const result = parseAndValidateDraftsJson("{not json");
    expect(result).toEqual({ ok: false, reason: "invalid_json" });
  });

  it("rejects empty response", () => {
    const result = parseAndValidateDraftsJson("   ");
    expect(result).toEqual({ ok: false, reason: "empty_llm_response" });
  });
});

describe("parseRawInputToDrafts", () => {
  it("extracts multiple drafts from one Russian message", async () => {
    const text =
      "в 03:20 поела 80 мл смеси, потом спала с 04:00 до 06:10, температура 37.2";
    const result = await parseRawInputToDrafts(
      { text, rawInputId: RAW_INPUT_ID },
      new RuleBasedRuProvider()
    );

    expect(result.ok).toBe(true);
    expect(result.drafts.length).toBeGreaterThanOrEqual(3);

    const types = result.drafts.map((draft) => draft.type);
    expect(types).toContain("feeding");
    expect(types).toContain("sleep");
    expect(types).toContain("symptom");

    const feeding = result.drafts.find((draft) => draft.type === "feeding");
    expect(feeding?.details).toMatchObject({ kind: "formula", volumeMl: 80 });
    expect(feeding?.rawInputId).toBe(RAW_INPUT_ID);

    const sleep = result.drafts.find((draft) => draft.type === "sleep");
    expect(sleep?.details).toMatchObject({
      startAt: expect.any(String),
      endAt: expect.any(String)
    });

    const symptom = result.drafts.find((draft) => draft.type === "symptom");
    expect(symptom?.details).toMatchObject({
      symptomType: "temperature",
      temperatureC: 37.2
    });

    expectAllRequireConfirmation(result.drafts);

    const highConfidence = result.drafts.find((draft) => draft.type === "feeding");
    expect(highConfidence?.confidence).toBeGreaterThanOrEqual(CONFIDENCE_CONFIRM_THRESHOLD);
    expect(highConfidence?.ambiguityReason).toBeUndefined();
  });

  it("marks ambiguous text with low confidence requiring confirmation", async () => {
    const result = await parseRawInputToDrafts(
      { text: "кажется сегодня хуже себя чувствует", rawInputId: RAW_INPUT_ID },
      new RuleBasedRuProvider()
    );

    expect(result.drafts.length).toBeGreaterThanOrEqual(1);
    const draft = result.drafts[0];
    expect(draft.confidence).toBeLessThan(CONFIDENCE_CONFIRM_THRESHOLD);
    expect(draft.requiresConfirmation).toBe(true);
    expect(draft.ambiguityReason).toBeDefined();
  });

  it("parses diaper without strict occurredAt", async () => {
    const result = await parseRawInputToDrafts(
      { text: "утром был жидкий стул", rawInputId: RAW_INPUT_ID },
      new RuleBasedRuProvider()
    );

    const diaper = result.drafts.find((draft) => draft.type === "diaper");
    expect(diaper).toBeDefined();
    expect(diaper?.details).toMatchObject({ kind: "stool" });
    expect(diaper?.occurredAt).toBeUndefined();
    expectAllRequireConfirmation(result.drafts);
  });

  it("returns fallback note on invalid JSON from provider", async () => {
    const result = await parseRawInputToDrafts(
      { text: "поел 90 мл", rawInputId: RAW_INPUT_ID },
      new StaticJsonLlmProvider("{broken")
    );

    expect(result.drafts).toHaveLength(1);
    expect(result.drafts[0].type).toBe("note");
    expect(result.drafts[0].fallbackReason).toBe("invalid_json");
    expect(result.drafts[0].requiresConfirmation).toBe(true);
    expect(result.drafts[0].ambiguityReason).toBe("parser_fallback");
    expect(result.fallbackReason).toBe("invalid_json");
  });

  it("returns fallback note on empty provider response", async () => {
    const result = await parseRawInputToDrafts(
      { text: "спала час", rawInputId: RAW_INPUT_ID },
      new EmptyLlmProvider()
    );

    expect(result.drafts).toHaveLength(1);
    expect(result.drafts[0].type).toBe("note");
    expect(result.drafts[0].fallbackReason).toBe("empty_llm_response");
    expect(result.drafts[0].ambiguityReason).toBe("parser_fallback");
    expectAllRequireConfirmation(result.drafts);
  });

  it("returns fallback note when provider throws", async () => {
    const result = await parseRawInputToDrafts(
      { text: "температура 38", rawInputId: RAW_INPUT_ID },
      new ThrowingLlmProvider()
    );

    expect(result.drafts).toHaveLength(1);
    expect(result.drafts[0].type).toBe("note");
    expect(result.fallbackReason).toBe("llm_provider_error");
    expect(result.drafts[0].ambiguityReason).toBe("parser_fallback");
    expectAllRequireConfirmation(result.drafts);
  });

  it("never returns final events — only draft-shaped payloads", async () => {
    const result = await parseRawInputToDrafts(
      { text: "поела 100 мл", rawInputId: RAW_INPUT_ID },
      new MockLlmProvider()
    );

    for (const draft of result.drafts) {
      expect(draft).not.toHaveProperty("familyId");
      expect(draft).not.toHaveProperty("childId");
      expect(draft).not.toHaveProperty("createdById");
      expect(draft.requiresConfirmation).toBe(true);
      expect(draftEventSchema.safeParse(draft).success).toBe(true);
    }
  });

  it("accepts multiple events from strict JSON provider", async () => {
    const json = JSON.stringify([
      {
        type: "feeding",
        details: { kind: "formula", volumeMl: 60 },
        confidence: 0.91,
        sourceFragment: "60 мл смеси"
      },
      {
        type: "sleep",
        details: {
          startAt: "2026-05-29T10:00:00.000Z",
          endAt: "2026-05-29T11:00:00.000Z"
        },
        confidence: 0.88,
        sourceFragment: "спала час"
      }
    ]);

    const result = await parseRawInputToDrafts(
      { text: "60 мл смеси, спала час", rawInputId: RAW_INPUT_ID },
      new StaticJsonLlmProvider(json)
    );

    expect(result.drafts).toHaveLength(2);
    expect(result.drafts.map((d) => d.type)).toEqual(["feeding", "sleep"]);
    expectAllRequireConfirmation(result.drafts);
    for (const draft of result.drafts) {
      expect(draft.confidence).toBeGreaterThanOrEqual(CONFIDENCE_CONFIRM_THRESHOLD);
      expect(draft.ambiguityReason).toBeUndefined();
    }
  });
});

describe("createFallbackNoteDraft", () => {
  it("creates confirmable note draft with reason metadata", () => {
    const draft = createFallbackNoteDraft("текст", RAW_INPUT_ID, "invalid_json");
    expect(draft.type).toBe("note");
    expect(draft.rawInputId).toBe(RAW_INPUT_ID);
    expect(draft.requiresConfirmation).toBe(true);
    expect(draft.fallbackReason).toBe("invalid_json");
    expect(draft.ambiguityReason).toBe("parser_fallback");
    expect(draft.details).toMatchObject({ parseFallback: true });
  });
});

describe("parseRu prompt", () => {
  it("is Russian and forbids medical advice", () => {
    const prompt = buildParseRuPrompt({ timezone: "Europe/Moscow", childAgeDays: 42 });
    expect(prompt).toMatch(/русск/i);
    expect(prompt).toMatch(/медицин/i);
    expect(prompt).toMatch(/диагноз/i);
    expect(prompt).not.toMatch(/рекомендуй лечение/i);
  });
});

describe("parseViaProvider compatibility", () => {
  it("wraps parseRawInputToDrafts", async () => {
    const result = await parseViaProvider("поела 70 мл", new RuleBasedRuProvider(), RAW_INPUT_ID);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.drafts[0].rawInputId).toBe(RAW_INPUT_ID);
      expectAllRequireConfirmation(result.drafts);
    }
  });
});
