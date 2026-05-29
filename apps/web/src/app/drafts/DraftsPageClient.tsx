"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ChildRequiredNotice } from "@/components/ChildRequiredNotice";
import { DraftReviewCard } from "@/components/DraftReviewCard";
import { ErrorBanner } from "@/components/ErrorBanner";
import { useAuth } from "@/lib/auth-context";
import { useAppError } from "@/lib/error-context";
import { confirmDraft, fetchDraft } from "@/lib/services";
import type { Draft } from "@/lib/types";
import {
  dismissDraft,
  getPendingDraftIds,
  removePendingDraft,
  trackPendingDraft
} from "@/lib/utils";

export default function DraftsPageClient() {
  const searchParams = useSearchParams();
  const { token, childId } = useAuth();
  const { runWithErrorHandling } = useAppError();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [manualId, setManualId] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const queryDraftId = searchParams.get("id");
    if (queryDraftId) {
      trackPendingDraft(queryDraftId);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    const ids = getPendingDraftIds();
    if (ids.length === 0) {
      setDrafts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    void runWithErrorHandling(async () => {
      const loaded = await Promise.all(
        ids.map(async (id) => {
          try {
            return await fetchDraft(token, id);
          } catch {
            removePendingDraft(id);
            return null;
          }
        })
      );
      setDrafts(
        loaded.filter((draft): draft is Draft => draft !== null && !draft.isConfirmed)
      );
      return true;
    }).finally(() => setLoading(false));
  }, [token, runWithErrorHandling]);

  async function loadDraftById(id: string) {
    if (!token) return;
    trackPendingDraft(id);
    await runWithErrorHandling(async () => {
      const draft = await fetchDraft(token, id);
      setDrafts((current) => {
        if (current.some((item) => item.id === draft.id)) return current;
        return [draft, ...current];
      });
      return true;
    });
  }

  async function handleConfirm(draftId: string) {
    if (!token) return;
    setBusyId(draftId);
    await runWithErrorHandling(async () => {
      await confirmDraft(token, draftId);
      removePendingDraft(draftId);
      setDrafts((current) => current.filter((draft) => draft.id !== draftId));
      return true;
    });
    setBusyId(null);
  }

  function handleReject(draftId: string) {
    dismissDraft(draftId);
    removePendingDraft(draftId);
    setDrafts((current) => current.filter((draft) => draft.id !== draftId));
  }

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <h1>Draft review</h1>
          <p>
            LLM drafts must be confirmed before they become final events. Reject removes them
            from this queue locally.
          </p>
        </div>
      </div>

      <ErrorBanner />
      <ChildRequiredNotice />

      <div className="card mb-4 space-y-3 p-4">
        <div className="text-sm text-[var(--muted)]">
          There is no server-side draft list yet. Paste a draft ID from Telegram or the parser
          workflow to review it here.
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            className="min-w-[240px] flex-1 rounded-[10px] border border-[var(--border)] px-3 py-2"
            placeholder="Draft ID"
            value={manualId}
            onChange={(event) => setManualId(event.target.value)}
          />
          <button
            className="btn btn-secondary"
            onClick={() => void loadDraftById(manualId.trim())}
            type="button"
          >
            Load draft
          </button>
        </div>
      </div>

      {loading ? <div className="text-sm text-[var(--muted)]">Loading drafts…</div> : null}

      {!loading && drafts.length === 0 ? (
        <div className="card p-6 text-sm text-[var(--muted)]">
          No pending drafts in this browser session
          {childId ? "." : ". Select a child profile first if drafts are child-specific."}
        </div>
      ) : null}

      <div className="space-y-3">
        {drafts.map((draft) => (
          <DraftReviewCard
            key={draft.id}
            draft={draft}
            busy={busyId === draft.id}
            onConfirm={() => void handleConfirm(draft.id)}
            onReject={() => handleReject(draft.id)}
          />
        ))}
      </div>
    </AppShell>
  );
}
