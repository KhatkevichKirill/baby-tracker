import { type DraftEvent } from "@baby-tracker/shared";
import { parseAndValidateDraftsJson } from "./json-parser";
import type { LlmParseResult, LlmProvider, LlmProviderInput } from "../parser/types";
import { buildParseRuPrompt } from "../templates/parse-ru.template";

export interface OpenAiProviderConfig {
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

interface OpenAiChatResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
}

export class OpenAiLlmProvider implements LlmProvider {
  constructor(private readonly config: OpenAiProviderConfig) {}

  async parseRawMessage(input: LlmProviderInput): Promise<LlmParseResult> {
    const systemPrompt = buildParseRuPrompt({
      timezone: input.timezone,
      childAgeDays: input.childAgeDays
    });

    let response: Response;
    try {
      response = await fetch(`${this.config.baseUrl ?? "https://api.openai.com/v1"}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: this.config.model ?? "gpt-4o-mini",
          temperature: 0.1,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: input.text }
          ]
        })
      });
    } catch {
      return {
        drafts: [],
        metadata: { fallbackReason: "llm_network_error" }
      };
    }

    if (!response.ok) {
      return {
        drafts: [],
        metadata: { fallbackReason: `llm_http_error_${response.status}` }
      };
    }

    const payload = (await response.json()) as OpenAiChatResponse;
    const content = payload.choices?.[0]?.message?.content ?? "";
    const parsed = parseAndValidateDraftsJson(content);

    if (!parsed.ok) {
      return {
        drafts: [],
        metadata: { fallbackReason: parsed.reason }
      };
    }

    return {
      drafts: parsed.drafts.map((draft) => normalizeDraft(draft, input.text)),
      metadata: parsed.drafts.some((draft) => draft.confidence < 0.5)
        ? { ambiguityReason: "low_confidence" }
        : undefined
    };
  }
}

function normalizeDraft(draft: DraftEvent, fullText: string): DraftEvent {
  return {
    ...draft,
    sourceFragment: draft.sourceFragment?.trim() || fullText.slice(0, 500)
  };
}
