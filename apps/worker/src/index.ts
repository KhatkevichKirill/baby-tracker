export {
  CONFIDENCE_CONFIRM_THRESHOLD,
  type LlmProvider,
  type LlmProviderInput,
  type LlmParseResult,
  type LlmParseMetadata,
  type ParseMessageInput,
  type ParsedDraft,
  type ParserFlowResult
} from "./parser/types";

export {
  parseRawInputToDrafts,
  parseViaProvider,
  createFallbackNoteDraft
} from "./parser/parse-message";

export {
  MockLlmProvider,
  RuleBasedRuProvider,
  createDefaultProvider
} from "./llm/provider";

export { OpenAiLlmProvider } from "./llm/openai-provider";
export { parseAndValidateDraftsJson, extractJsonPayload } from "./llm/json-parser";
export { buildParseRuPrompt, parseRuPromptTemplate } from "./templates/parse-ru.template";

import { RuleBasedRuProvider } from "./llm/provider";
import { parseRawInputToDrafts } from "./parser/parse-message";

/** @deprecated Use parseRawInputToDrafts — kept for backward compatibility. */
export function parseMessageToDrafts(text: string) {
  return parseRawInputToDrafts(
    { text, rawInputId: "00000000-0000-4000-8000-000000000000" },
    new RuleBasedRuProvider()
  ).then((result) => {
    if (!result.ok) {
      return { ok: false as const, reason: result.reason ?? "parse_failed", drafts: result.drafts };
    }
    return { ok: true as const, drafts: result.drafts };
  });
}

console.log("Worker parser module loaded. Use parseRawInputToDrafts for confirmable draft flow.");
