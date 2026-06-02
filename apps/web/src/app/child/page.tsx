"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ErrorBanner } from "@/components/ErrorBanner";
import { useAuth } from "@/lib/auth-context";
import { useAppError } from "@/lib/error-context";
import { createChild, fetchChild } from "@/lib/services";
import type { Child } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export default function ChildProfilePage() {
  const { token, childId, setChildId } = useAuth();
  const { runWithErrorHandling } = useAppError();
  const [child, setChild] = useState<Child | null>(null);
  const [name, setName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [sexAtBirth, setSexAtBirth] = useState("");
  const [manualChildId, setManualChildId] = useState(childId ?? "");
  const [loading, setLoading] = useState(Boolean(childId));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token || !childId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    void runWithErrorHandling(async () => {
      const loaded = await fetchChild(token, childId);
      setChild(loaded);
      return true;
    }).finally(() => setLoading(false));
  }, [token, childId, runWithErrorHandling]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    if (!token) return;

    setSaving(true);
    await runWithErrorHandling(async () => {
      const created = await createChild(token, {
        name,
        dateOfBirth: new Date(dateOfBirth).toISOString(),
        sexAtBirth: sexAtBirth || undefined
      });
      setChild(created);
      setChildId(created.id);
      setManualChildId(created.id);
      return true;
    });
    setSaving(false);
  }

  async function handleSelectChild(event: React.FormEvent) {
    event.preventDefault();
    if (!token || !manualChildId.trim()) return;

    setLoading(true);
    await runWithErrorHandling(async () => {
      const loaded = await fetchChild(token, manualChildId.trim());
      setChild(loaded);
      setChildId(loaded.id);
      return true;
    }).finally(() => setLoading(false));
  }

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <h1>Child profile</h1>
          <p>Create a child or select an existing profile for this browser session.</p>
        </div>
      </div>

      <ErrorBanner />

      <div className="grid gap-6 lg:grid-cols-2">
        <form className="card space-y-4 p-5" onSubmit={handleCreate}>
          <h2 className="text-lg font-bold">Create child</h2>
          <div className="field">
            <label htmlFor="name">Name</label>
            <input id="name" value={name} onChange={(event) => setName(event.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="dateOfBirth">Date of birth</label>
            <input
              id="dateOfBirth"
              type="date"
              value={dateOfBirth}
              onChange={(event) => setDateOfBirth(event.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="sexAtBirth">Sex at birth (optional)</label>
            <select
              id="sexAtBirth"
              value={sexAtBirth}
              onChange={(event) => setSexAtBirth(event.target.value)}
            >
              <option value="">Not set</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="unknown">Unknown</option>
            </select>
          </div>
          <button className="btn btn-primary" disabled={saving} type="submit">
            {saving ? "Creating…" : "Create child"}
          </button>
        </form>

        <form className="card space-y-4 p-5" onSubmit={handleSelectChild}>
          <h2 className="text-lg font-bold">Select existing child</h2>
          <p className="text-sm text-[var(--muted)]">
            The API does not expose a list endpoint yet, so paste a child ID you already know.
          </p>
          <div className="field">
            <label htmlFor="childId">Child ID</label>
            <input
              id="childId"
              value={manualChildId}
              onChange={(event) => setManualChildId(event.target.value)}
              placeholder="UUID"
              required
            />
          </div>
          <button className="btn btn-secondary" type="submit">
            Load child
          </button>
        </form>
      </div>

      {loading ? <div className="mt-6 text-sm text-[var(--muted)]">Loading child…</div> : null}

      {child ? (
        <section className="card mt-6 p-5">
          <h2 className="text-lg font-bold">Active child</h2>
          <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
            <div>
              <dt className="font-semibold text-[var(--muted)]">Name</dt>
              <dd>{child.name}</dd>
            </div>
            <div>
              <dt className="font-semibold text-[var(--muted)]">Date of birth</dt>
              <dd>{formatDate(child.dateOfBirth)}</dd>
            </div>
            <div>
              <dt className="font-semibold text-[var(--muted)]">Sex at birth</dt>
              <dd>{child.sexAtBirth ?? "Not set"}</dd>
            </div>
            <div>
              <dt className="font-semibold text-[var(--muted)]">Child ID</dt>
              <dd className="break-all font-mono text-xs">{child.id}</dd>
            </div>
          </dl>
        </section>
      ) : null}
    </AppShell>
  );
}
