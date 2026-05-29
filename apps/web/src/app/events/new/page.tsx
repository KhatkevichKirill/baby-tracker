"use client";

import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { ChildRequiredNotice } from "@/components/ChildRequiredNotice";
import { ErrorBanner } from "@/components/ErrorBanner";
import { EventForm, type EventFormValues } from "@/components/EventForm";
import { useAuth } from "@/lib/auth-context";
import { useAppError } from "@/lib/error-context";
import { createEvent } from "@/lib/services";

export default function NewEventPage() {
  const router = useRouter();
  const { token, childId } = useAuth();
  const { runWithErrorHandling } = useAppError();

  async function handleSubmit(values: EventFormValues) {
    if (!token || !childId) return;

    await runWithErrorHandling(async () => {
      await createEvent(token, {
        childId,
        type: values.type,
        occurredAt: values.occurredAt,
        source: "web",
        note: values.note || undefined,
        details: values.details
      });
      router.push("/timeline");
      return true;
    });
  }

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <h1>Add event</h1>
          <p>Create a final event directly from the web form.</p>
        </div>
      </div>

      <ErrorBanner />
      <ChildRequiredNotice />

      {childId ? (
        <EventForm submitLabel="Create final event" onSubmit={handleSubmit} />
      ) : null}
    </AppShell>
  );
}
