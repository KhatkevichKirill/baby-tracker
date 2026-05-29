import { draftEventSchema, type DraftEvent } from "@baby-tracker/shared";

export interface LlmProvider {
  parseRawMessage(input: {
    text: string;
    childAgeDays?: number;
    timezone: string;
  }): Promise<{ drafts: DraftEvent[] }>;
}

export class MockLlmProvider implements LlmProvider {
  async parseRawMessage(input: { text: string }): Promise<{ drafts: DraftEvent[] }> {
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
  async parseRawMessage(input: { text: string }): Promise<{ drafts: DraftEvent[] }> {
    const text = input.text.toLowerCase();
    const drafts: DraftEvent[] = [];

    const volumeMatch = text.match(/(\d{2,3})\s*мл/);
    if (text.includes("поел") || text.includes("поела") || text.includes("корм")) {
      drafts.push(
        draftEventSchema.parse({
          type: "feeding",
          details: {
            kind: text.includes("смес") ? "formula" : "breast",
            volumeMl: volumeMatch ? Number(volumeMatch[1]) : undefined
          },
          confidence: volumeMatch ? 0.82 : 0.65,
          sourceFragment: input.text
        })
      );
    }

    const temperatureMatch = text.match(/(3[5-9](?:[,.]\d)?|4[0-2](?:[,.]\d)?)/);
    if (text.includes("температур") || temperatureMatch) {
      drafts.push(
        draftEventSchema.parse({
          type: "symptom",
          details: {
            symptomType: "temperature",
            temperatureC: temperatureMatch ? Number(temperatureMatch[1].replace(",", ".")) : undefined
          },
          confidence: temperatureMatch ? 0.86 : 0.55,
          sourceFragment: input.text
        })
      );
    }

    if (text.includes("спал") || text.includes("спала") || text.includes("сон")) {
      drafts.push(
        draftEventSchema.parse({
          type: "sleep",
          details: {
            startAt: new Date().toISOString()
          },
          confidence: 0.55,
          sourceFragment: input.text
        })
      );
    }

    if (text.includes("стул") || text.includes("какал") || text.includes("какала")) {
      drafts.push(
        draftEventSchema.parse({
          type: "diaper",
          details: {
            kind: "stool"
          },
          confidence: 0.78,
          sourceFragment: input.text
        })
      );
    }

    if (drafts.length === 0) {
      drafts.push(
        draftEventSchema.parse({
          type: "note",
          details: { text: input.text },
          confidence: 0.4,
          sourceFragment: input.text
        })
      );
    }

    return { drafts };
  }
}
