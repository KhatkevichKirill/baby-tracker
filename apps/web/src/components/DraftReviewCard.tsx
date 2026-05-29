"use client";

import { EventTypeBadge } from "@/components/EventTypeBadge";
import type { Draft } from "@/lib/types";
import { draftSummary, formatDate, formatPercent, formatTime } from "@/lib/utils";

export function DraftReviewCard({
  draft,
  onConfirm,
  onReject,
  busy
}: {
  draft: Draft;
  onConfirm: () => void;
  onReject: () => void;
  busy?: boolean;
}) {
  return (
    <article className="card border-amber-200 bg-[var(--draft-soft)]/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <EventTypeBadge type={draft.type} variant="draft" />
            <span className="badge badge-draft">Draft</span>
            <span className="text-sm font-semibold text-[var(--muted)]">
              Confidence {formatPercent(draft.confidence)}
            </span>
          </div>
          <div className="font-semibold">{draftSummary(draft)}</div>
          <div className="text-sm text-[var(--muted)]">
            Source: “{draft.sourceFragment}”
          </div>
          <div className="text-sm text-[var(--muted)]">
            {draft.occurredAt
              ? `${formatDate(draft.occurredAt)} · ${formatTime(draft.occurredAt)}`
              : `Created ${formatDate(draft.createdAt)}`}
          </div>
          {draft.isConfirmed ? (
            <div className="text-sm font-semibold text-[var(--final)]">
              Already confirmed as final event
            </div>
          ) : null}
        </div>
        {!draft.isConfirmed ? (
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-primary" disabled={busy} onClick={onConfirm} type="button">
              Confirm
            </button>
            <button className="btn btn-danger" disabled={busy} onClick={onReject} type="button">
              Reject
            </button>
          </div>
        ) : null}
      </div>
    </article>
  );
}
