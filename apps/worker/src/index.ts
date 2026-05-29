import { draftEventSchema } from "@baby-tracker/shared";
import { RuleBasedRuProvider, type LlmProvider } from "./llm/provider";

type ParseResult =
  | { ok: true; drafts: Array<unknown> }
  | { ok: false; reason: string };

export function parseMessageToDrafts(text: string): ParseResult {
  // Placeholder parser for MVP wiring. Later replaced by LLM provider.
  if (!text.trim()) return { ok: false, reason: "empty text" };
  const draft = {
    type: "note",
    details: { text },
    confidence: 0.4,
    sourceFragment: text
  };
  const validated = draftEventSchema.safeParse(draft);
  if (!validated.success) return { ok: false, reason: "invalid draft schema" };
  return { ok: true, drafts: [validated.data] };
}

export async function parseViaProvider(
  text: string,
  provider: LlmProvider = new RuleBasedRuProvider()
): Promise<ParseResult> {
  if (!text.trim()) return { ok: false, reason: "empty text" };

  const result = await provider.parseRawMessage({
    text,
    timezone: "UTC"
  });

  const validated = result.drafts
    .map((item) => draftEventSchema.safeParse(item))
    .filter((item) => item.success)
    .map((item) => item.data);

  if (!validated.length) {
    return { ok: false, reason: "provider returned no valid drafts" };
  }
  return { ok: true, drafts: validated };
}
