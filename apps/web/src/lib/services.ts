import { apiFetch } from "./api";
import type {
  ApiEvent,
  AuthResponse,
  Child,
  DailyAnalytics,
  Draft,
  EventType,
  WeeklyAnalytics
} from "./types";

export async function loginRequest(email: string, password: string): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
}

export async function fetchChild(token: string, childId: string): Promise<Child> {
  return apiFetch<Child>(`/children/${childId}`, {}, token);
}

export async function createChild(
  token: string,
  body: { name: string; dateOfBirth: string; sexAtBirth?: string }
): Promise<Child> {
  return apiFetch<Child>(
    "/children",
    {
      method: "POST",
      body: JSON.stringify(body)
    },
    token
  );
}

export async function fetchTimeline(
  token: string,
  childId: string,
  type?: EventType
): Promise<ApiEvent[]> {
  const query = type ? `?type=${encodeURIComponent(type)}` : "";
  return apiFetch<ApiEvent[]>(`/events/timeline/${childId}${query}`, {}, token);
}

export async function fetchEvent(token: string, eventId: string): Promise<ApiEvent> {
  return apiFetch<ApiEvent>(`/events/${eventId}`, {}, token);
}

export async function createEvent(
  token: string,
  body: {
    childId: string;
    type: EventType;
    occurredAt: string;
    source: "web";
    note?: string;
    details?: Record<string, unknown>;
  }
): Promise<ApiEvent> {
  return apiFetch<ApiEvent>(
    "/events",
    {
      method: "POST",
      body: JSON.stringify(body)
    },
    token
  );
}

export async function updateEvent(
  token: string,
  eventId: string,
  body: {
    occurredAt?: string;
    note?: string | null;
    details?: Record<string, unknown>;
  }
): Promise<ApiEvent> {
  return apiFetch<ApiEvent>(
    `/events/${eventId}`,
    {
      method: "PATCH",
      body: JSON.stringify(body)
    },
    token
  );
}

export async function deleteEvent(
  token: string,
  eventId: string
): Promise<{ id: string; deleted: boolean }> {
  return apiFetch<{ id: string; deleted: boolean }>(
    `/events/${eventId}`,
    { method: "DELETE" },
    token
  );
}

export async function fetchDraft(token: string, draftId: string): Promise<Draft> {
  return apiFetch<Draft>(`/drafts/${draftId}`, {}, token);
}

export async function confirmDraft(token: string, draftId: string): Promise<ApiEvent> {
  return apiFetch<ApiEvent>(
    `/drafts/${draftId}/confirm`,
    { method: "PATCH", body: JSON.stringify({}) },
    token
  );
}

export async function fetchDailyAnalytics(
  token: string,
  childId: string
): Promise<DailyAnalytics> {
  return apiFetch<DailyAnalytics>(`/analytics/daily/${childId}`, {}, token);
}

export async function fetchWeeklyAnalytics(
  token: string,
  childId: string
): Promise<WeeklyAnalytics> {
  return apiFetch<WeeklyAnalytics>(`/analytics/weekly/${childId}`, {}, token);
}
