import type { ApiEvent, Draft, EventType } from "./types";

const PENDING_DRAFTS_KEY = "baby-tracker-pending-drafts";
const DISMISSED_DRAFTS_KEY = "baby-tracker-dismissed-drafts";

function readJsonArray(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function writeJsonArray(key: string, values: string[]): void {
  localStorage.setItem(key, JSON.stringify(Array.from(new Set(values))));
}

export function getPendingDraftIds(): string[] {
  return readJsonArray(PENDING_DRAFTS_KEY).filter(
    (id) => !readJsonArray(DISMISSED_DRAFTS_KEY).includes(id)
  );
}

export function trackPendingDraft(draftId: string): void {
  const pending = readJsonArray(PENDING_DRAFTS_KEY);
  pending.unshift(draftId);
  writeJsonArray(PENDING_DRAFTS_KEY, pending.slice(0, 50));
}

export function dismissDraft(draftId: string): void {
  const dismissed = readJsonArray(DISMISSED_DRAFTS_KEY);
  dismissed.unshift(draftId);
  writeJsonArray(DISMISSED_DRAFTS_KEY, dismissed.slice(0, 100));
}

export function removePendingDraft(draftId: string): void {
  const pending = readJsonArray(PENDING_DRAFTS_KEY).filter((id) => id !== draftId);
  writeJsonArray(PENDING_DRAFTS_KEY, pending);
}

export function eventDetails(event: ApiEvent): Record<string, unknown> {
  if (event.feedingEvent) {
    return {
      kind: event.feedingEvent.kind,
      volumeMl: event.feedingEvent.volumeMl ?? undefined,
      durationMin: event.feedingEvent.durationMin ?? undefined,
      breastSide: event.feedingEvent.breastSide ?? undefined
    };
  }
  if (event.sleepEvent) {
    return {
      startAt: event.sleepEvent.startAt,
      endAt: event.sleepEvent.endAt ?? undefined,
      quality: event.sleepEvent.quality ?? undefined,
      location: event.sleepEvent.location ?? undefined
    };
  }
  if (event.diaperEvent) {
    return {
      kind: event.diaperEvent.kind,
      color: event.diaperEvent.color ?? undefined,
      consistency: event.diaperEvent.consistency ?? undefined
    };
  }
  if (event.symptomEvent) {
    return {
      symptomType: event.symptomEvent.symptomType,
      temperatureC: event.symptomEvent.temperatureC ?? undefined,
      intensity: event.symptomEvent.intensity ?? undefined
    };
  }
  if (event.measurement) {
    return {
      weightKg: event.measurement.weightKg ?? undefined,
      heightCm: event.measurement.heightCm ?? undefined,
      headCircumferenceCm: event.measurement.headCircumferenceCm ?? undefined,
      temperatureC: event.measurement.temperatureC ?? undefined
    };
  }
  return (event.detailsJson as Record<string, unknown> | null | undefined) ?? {};
}

export function eventSummary(event: ApiEvent): string {
  const details = eventDetails(event);
  switch (event.type) {
    case "feeding":
      return [
        details.kind,
        details.volumeMl ? `${details.volumeMl} ml` : null,
        details.durationMin ? `${details.durationMin} min` : null
      ]
        .filter(Boolean)
        .join(" · ");
    case "sleep":
      return [details.quality, details.location].filter(Boolean).join(" · ") || "Sleep session";
    case "diaper":
      return [details.kind, details.color].filter(Boolean).join(" · ");
    case "symptom":
      return [
        details.symptomType,
        details.temperatureC ? `${details.temperatureC}°C` : null,
        details.intensity ? `intensity ${details.intensity}` : null
      ]
        .filter(Boolean)
        .join(" · ");
    case "measurement":
      return [
        details.weightKg ? `${details.weightKg} kg` : null,
        details.heightCm ? `${details.heightCm} cm` : null,
        details.temperatureC ? `${details.temperatureC}°C` : null
      ]
        .filter(Boolean)
        .join(" · ");
    default:
      return event.note || JSON.stringify(details);
  }
}

export function draftSummary(draft: Draft): string {
  const details = draft.detailsJson ?? {};
  switch (draft.type) {
    case "feeding":
      return [details.kind, details.volumeMl ? `${details.volumeMl} ml` : null]
        .filter(Boolean)
        .join(" · ");
    case "symptom":
      return [details.symptomType, details.temperatureC ? `${details.temperatureC}°C` : null]
        .filter(Boolean)
        .join(" · ");
    default:
      return draft.sourceFragment;
  }
}

export function isSameDay(isoDate: string, day: string): boolean {
  return isoDate.slice(0, 10) === day;
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function toDatetimeLocalValue(iso?: string | null): string {
  const date = iso ? new Date(iso) : new Date();
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

export function fromDatetimeLocalValue(value: string): string {
  return new Date(value).toISOString();
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric"
  });
}

export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function filterEventsByDate(events: ApiEvent[], date: string): ApiEvent[] {
  return events.filter((event) => isSameDay(event.occurredAt, date));
}

export function filterEventsByType(events: ApiEvent[], type: EventType | "all"): ApiEvent[] {
  if (type === "all") return events;
  return events.filter((event) => event.type === type);
}
