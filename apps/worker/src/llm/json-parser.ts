import { draftEventSchema, type DraftEvent } from "@baby-tracker/shared";
import { z } from "zod";

const llmDraftArraySchema = z.array(draftEventSchema);

export type JsonParseFailureReason =
  | "empty_llm_response"
  | "invalid_json"
  | "schema_validation_failed"
  | "empty_drafts_array";

export type JsonParseResult =
  | { ok: true; drafts: DraftEvent[] }
  | { ok: false; reason: JsonParseFailureReason };

export function extractJsonPayload(raw: string): string {
  const trimmed = raw.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) {
    return fenceMatch[1].trim();
  }

  const arrayStart = trimmed.indexOf("[");
  const arrayEnd = trimmed.lastIndexOf("]");
  if (arrayStart >= 0 && arrayEnd > arrayStart) {
    return trimmed.slice(arrayStart, arrayEnd + 1);
  }

  return trimmed;
}

export function parseAndValidateDraftsJson(raw: string): JsonParseResult {
  if (!raw.trim()) {
    return { ok: false, reason: "empty_llm_response" };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJsonPayload(raw));
  } catch {
    return { ok: false, reason: "invalid_json" };
  }

  const validated = llmDraftArraySchema.safeParse(parsed);
  if (!validated.success) {
    return { ok: false, reason: "schema_validation_failed" };
  }

  if (validated.data.length === 0) {
    return { ok: false, reason: "empty_drafts_array" };
  }

  return { ok: true, drafts: validated.data };
}
