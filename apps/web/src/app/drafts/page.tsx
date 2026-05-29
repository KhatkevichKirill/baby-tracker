import { Suspense } from "react";
import DraftsPageClient from "./DraftsPageClient";

export default function DraftsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-[var(--muted)]">Loading drafts…</div>}>
      <DraftsPageClient />
    </Suspense>
  );
}
