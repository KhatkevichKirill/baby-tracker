import { draftEventSchema, type DraftEvent } from "@baby-tracker/shared";
import type { LlmParseResult, LlmProvider, LlmProviderInput } from "../parser/types";

export type { LlmProvider, LlmProviderInput, LlmParseResult };

function timeToIsoToday(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const now = new Date();
  const date = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hours, minutes)
  );
  return date.toISOString();
}

function splitIntoSegments(text: string): string[] {
  return text
    .split(/[,;]|\s+потом\s+/i)
    .map((segment) => segment.trim())
    .filter(Boolean);
}

export class MockLlmProvider implements LlmProvider {
  async parseRawMessage(input: LlmProviderInput): Promise<LlmParseResult> {
    const draft = draftEventSchema.parse({
      type: "note",
      details: { text: input.text },
      confidence: 0.51,
      sourceFragment: input.text
    });
    return { drafts: [draft] };
  }
}

export class RuleBasedRuProvider implements LlmProvider {
  async parseRawMessage(input: LlmProviderInput): Promise<LlmParseResult> {
    const segments = splitIntoSegments(input.text);
    const drafts: DraftEvent[] = [];

    for (const segment of segments) {
      drafts.push(...this.parseSegment(segment, input.text));
    }

    if (drafts.length === 0) {
      drafts.push(this.createNoteDraft(input.text, 0.4));
    }

    const lowConfidence = drafts.some((draft) => draft.confidence < 0.5);
    return {
      drafts,
      metadata: lowConfidence ? { ambiguityReason: "low_confidence" } : undefined
    };
  }

  private parseSegment(segment: string, fullText: string): DraftEvent[] {
    const text = segment.toLowerCase();
    const drafts: DraftEvent[] = [];
    const sourceFragment = segment.trim() || fullText;

    const volumeMatch = text.match(/(\d{2,3})\s*мл/);
    if (text.includes("поел") || text.includes("поела") || text.includes("корм")) {
      const atMatch = text.match(/(?:в\s+)?(\d{1,2}:\d{2})/);
      drafts.push(
        draftEventSchema.parse({
          type: "feeding",
          occurredAt: atMatch ? timeToIsoToday(atMatch[1]) : undefined,
          details: {
            kind: text.includes("смес") ? "formula" : "breast",
            volumeMl: volumeMatch ? Number(volumeMatch[1]) : undefined
          },
          confidence: volumeMatch ? 0.82 : 0.65,
          sourceFragment
        })
      );
    }

    const sleepRangeMatch = text.match(/(?:с\s+)?(\d{1,2}:\d{2})\s+до\s+(\d{1,2}:\d{2})/);
    if (text.includes("спал") || text.includes("спала") || text.includes("сон") || sleepRangeMatch) {
      drafts.push(
        draftEventSchema.parse({
          type: "sleep",
          details: {
            startAt: sleepRangeMatch ? timeToIsoToday(sleepRangeMatch[1]) : new Date().toISOString(),
            endAt: sleepRangeMatch ? timeToIsoToday(sleepRangeMatch[2]) : undefined
          },
          confidence: sleepRangeMatch ? 0.84 : 0.55,
          sourceFragment
        })
      );
    }

    const temperatureMatch =
      text.match(/температур[аы]?\s*(\d+(?:[,.]\d+)?)/) ??
      text.match(/\b(3[5-9](?:[,.]\d)?|4[0-2](?:[,.]\d)?)\b/);
    if (text.includes("температур") || (text.includes("темп") && temperatureMatch)) {
      drafts.push(
        draftEventSchema.parse({
          type: "symptom",
          details: {
            symptomType: "temperature",
            temperatureC: temperatureMatch
              ? Number(temperatureMatch[1].replace(",", "."))
              : undefined
          },
          confidence: temperatureMatch ? 0.86 : 0.55,
          sourceFragment
        })
      );
    }

    if (text.includes("стул") || text.includes("какал") || text.includes("какала")) {
      const consistency = text.includes("жидк") ? "liquid" : undefined;
      drafts.push(
        draftEventSchema.parse({
          type: "diaper",
          details: {
            kind: "stool",
            consistency
          },
          confidence: text.includes("утром") ? 0.72 : 0.78,
          sourceFragment
        })
      );
    }

    const weightMatch = text.match(/(\d+(?:[,.]\d+)?)\s*кг/);
    if (weightMatch) {
      drafts.push(
        draftEventSchema.parse({
          type: "measurement",
          details: {
            weightKg: Number(weightMatch[1].replace(",", "."))
          },
          confidence: 0.8,
          sourceFragment
        })
      );
    }

    if (
      text.includes("хуже") ||
      text.includes("плохо") ||
      text.includes("кажется") ||
      text.includes("беспоко")
    ) {
      drafts.push(
        draftEventSchema.parse({
          type: "symptom",
          details: {
            symptomType: "general_discomfort"
          },
          confidence: 0.42,
          sourceFragment
        })
      );
    }

    return drafts;
  }

  private createNoteDraft(text: string, confidence: number): DraftEvent {
    return draftEventSchema.parse({
      type: "note",
      details: { text },
      confidence,
      sourceFragment: text
    });
  }
}

export function createDefaultProvider(): LlmProvider {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (apiKey && apiKey !== "replace_me") {
    // Lazy import keeps rule-based parser usable without network in tests/dev.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { OpenAiLlmProvider } = require("./openai-provider") as typeof import("./openai-provider");
    return new OpenAiLlmProvider({ apiKey });
  }
  return new RuleBasedRuProvider();
}
