import type { DraftEvent } from "@baby-tracker/shared";

/** Drafts below this confidence always require caregiver confirmation. */
export const CONFIDENCE_CONFIRM_THRESHOLD = 0.7;

export interface ParseMessageInput {
  text: string;
  rawInputId: string;
  timezone?: string;
  childAgeDays?: number;
}

export interface ParsedDraft extends DraftEvent {
  rawInputId: string;
  requiresConfirmation: boolean;
  fallbackReason?: string;
  ambiguityReason?: string;
}

export interface ParserFlowResult {
  ok: boolean;
  reason?: string;
  drafts: ParsedDraft[];
  fallbackReason?: string;
}

export interface LlmParseMetadata {
  fallbackReason?: string;
  ambiguityReason?: string;
}

export interface LlmParseResult {
  drafts: DraftEvent[];
  metadata?: LlmParseMetadata;
}

export interface LlmProviderInput {
  text: string;
  childAgeDays?: number;
  timezone: string;
  rawInputId?: string;
}

export interface LlmProvider {
  parseRawMessage(input: LlmProviderInput): Promise<LlmParseResult>;
}
