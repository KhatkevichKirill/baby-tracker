"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ErrorBanner } from "@/components/ErrorBanner";
import { EventForm, type EventFormValues } from "@/components/EventForm";
import { useAuth } from "@/lib/auth-context";
import { useAppError } from "@/lib/error-context";
import { deleteEvent, fetchEvent, updateEvent } from "@/lib/services";
import type { ApiEvent } from "@/lib/types";
import { eventDetails } from "@/lib/utils";

export default function EditEventPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuth();
  const { runWithErrorHandling } = useAppError();
  const [event, setEvent] = useState<ApiEvent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !params.id) {
      setLoading(false);
      return;
    }

    void runWithErrorHandling(async () => {
      const loaded = await fetchEvent(token, params.id);
      setEvent(loaded);
      return true;
    }).finally(() => setLoading(false));
  }, [token, params.id, runWithErrorHandling]);

  async function handleSubmit(values: EventFormValues) {
    if (!token || !event) return;

    await runWithErrorHandling(async () => {
      await updateEvent(token, event.id, {
        occurredAt: values.occurredAt,
        note: values.note || null,
        details: values.details
      });
      router.push("/timeline");
      return true;
    });
  }

  async function handleDelete() {
    if (!token || !event) return;
    if (!window.confirm("Delete this final event?")) return;

    await runWithErrorHandling(async () => {
      await deleteEvent(token, event.id);
      router.push("/timeline");
      return true;
    });
  }

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <h1>Edit event</h1>
          <p>Update a confirmed final event.</p>
        </div>
        {event ? (
          <button className="btn btn-danger" onClick={handleDelete} type="button">
            Delete
          </button>
        ) : null}
      </div>

      <ErrorBanner />

      {loading ? <div className="text-sm text-[var(--muted)]">Loading event…</div> : null}

      {event ? (
        <EventForm
          initialValues={{
            type: event.type,
            occurredAt: event.occurredAt,
            note: event.note ?? "",
            details: eventDetails(event)
          }}
          lockType
          submitLabel="Save changes"
          onSubmit={handleSubmit}
        />
      ) : null}
    </AppShell>
  );
}
