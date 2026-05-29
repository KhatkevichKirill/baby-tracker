import type { EventType } from "@/lib/types";
import { EVENT_TYPE_LABELS } from "@/lib/types";

export function EventTypeBadge({
  type,
  variant = "final"
}: {
  type: EventType | string;
  variant?: "final" | "draft";
}) {
  return (
    <span className={`badge ${variant === "draft" ? "badge-draft" : "badge-final"}`}>
      {EVENT_TYPE_LABELS[type as EventType] ?? type}
    </span>
  );
}
