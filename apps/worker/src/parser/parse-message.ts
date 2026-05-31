import { draftEventSchema, type DraftEvent } from "@baby-tracker/shared";
import type {
  LlmParseMetadata,
  LlmProvider,
  ParseMessageInput,
  ParsedDraft,
  ParserFlowResult
} from "./types";
import { CONFIDENCE_CONFIRM_THRESHOLD } from "./types";

export function createFallbackNoteDraft(
  text: string,
  rawInputId: string,
  fallbackReason: string
): ParsedDraft {
  const draft = draftEventSchema.parse({
    type: "note",
    details: {
      text: text || "(пустое сообщение)",
      parseFallback: true,
      reason: fallbackReason
    },
    confidence: 0.3,
    sourceFragment: text || "(пустое сообщение)"
  });

  return {
    ...draft,
    rawInputId,
    requiresConfirmation: true,
    fallbackReason,
    ambiguityReason: "parser_fallback"
  };
}

function toParsedDraft(
  draft: DraftEvent,
  rawInputId: string,
  metadata?: LlmParseMetadata
): ParsedDraft {
  const lowConfidence = draft.confidence < CONFIDENCE_CONFIRM_THRESHOLD;
  const ambiguityReason = lowConfidence
    ? metadata?.ambiguityReason ??
      (draft.confidence < 0.5 ? "low_confidence" : "needs_confirmation")
    : metadata?.ambiguityReason;

  return {
    ...draft,
    rawInputId,
    requiresConfirmation: true,
    fallbackReason: metadata?.fallbackReason,
    ambiguityReason
  };
}

/**
 * Parses caregiver text into draft events only — never creates final Event records.
 */
export async function parseRawInputToDrafts(
  input: ParseMessageInput,
  provider: LlmProvider
): Promise<ParserFlowResult> {
  const text = input.text.trim();
  if (!text) {
    return {
      ok: false,
      reason: "empty_text",
      drafts: [createFallbackNoteDraft("", input.rawInputId, "empty_text")],
      fallbackReason: "empty_text"
    };
  }

  let llmResult;
  try {
    llmResult = await provider.parseRawMessage({
      text,
      rawInputId: input.rawInputId,
      timezone: input.timezone ?? "UTC",
      childAgeDays: input.childAgeDays
    });
  } catch {
    const fallbackReason = "llm_provider_error";
    return {
      ok: true,
      drafts: [createFallbackNoteDraft(text, input.rawInputId, fallbackReason)],
      fallbackReason
    };
  }

  const validated = llmResult.drafts
    .map((item) => draftEventSchema.safeParse(item))
    .filter((item) => item.success)
    .map((item) => item.data);

  if (!validated.length) {
    const fallbackReason = llmResult.metadata?.fallbackReason ?? "no_valid_drafts";
    return {
      ok: true,
      drafts: [createFallbackNoteDraft(text, input.rawInputId, fallbackReason)],
      fallbackReason
    };
  }

  return {
    ok: true,
    drafts: validated.map((draft) =>
      toParsedDraft(draft, input.rawInputId, llmResult.metadata)
    )
  };
}

/** @deprecated Use parseRawInputToDrafts — kept for backward compatibility. */
export async function parseViaProvider(
  text: string,
  provider: LlmProvider,
  rawInputId = "00000000-0000-4000-8000-000000000000"
): Promise<{ ok: true; drafts: ParsedDraft[] } | { ok: false; reason: string; drafts: ParsedDraft[] }> {
  const result = await parseRawInputToDrafts({ text, rawInputId }, provider);
  if (!result.ok) {
    return { ok: false, reason: result.reason ?? "parse_failed", drafts: result.drafts };
  }
  return { ok: true, drafts: result.drafts };
}
