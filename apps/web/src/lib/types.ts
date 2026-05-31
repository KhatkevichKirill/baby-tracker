export type EventType =
  | "feeding"
  | "sleep"
  | "diaper"
  | "symptom"
  | "medication"
  | "measurement"
  | "doctor_visit"
  | "lab_result"
  | "note";

export type Source = "telegram" | "web" | "system";

export interface User {
  id: string;
  email: string;
  displayName: string;
}

export interface Family {
  id: string;
  name: string;
  role: string;
}

export interface AuthResponse {
  token: string;
  user: User;
  families: Family[];
}

export interface MeResponse {
  user: User;
  families: Family[];
}

export interface Child {
  id: string;
  familyId: string;
  name: string;
  dateOfBirth: string;
  sexAtBirth?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiEvent {
  id: string;
  familyId: string;
  childId: string;
  createdById: string;
  rawInputId?: string | null;
  type: EventType;
  occurredAt: string;
  source: Source;
  note?: string | null;
  detailsJson?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  feedingEvent?: {
    kind: string;
    volumeMl?: number | null;
    durationMin?: number | null;
    breastSide?: string | null;
  } | null;
  sleepEvent?: {
    startAt: string;
    endAt?: string | null;
    quality?: string | null;
    location?: string | null;
  } | null;
  diaperEvent?: {
    kind: string;
    color?: string | null;
    consistency?: string | null;
  } | null;
  symptomEvent?: {
    symptomType: string;
    temperatureC?: number | null;
    intensity?: number | null;
  } | null;
  measurement?: {
    weightKg?: number | null;
    heightCm?: number | null;
    headCircumferenceCm?: number | null;
    temperatureC?: number | null;
  } | null;
}

export interface Draft {
  id: string;
  familyId: string;
  childId: string;
  rawInputId: string;
  type: EventType;
  occurredAt?: string | null;
  detailsJson: Record<string, unknown>;
  confidence: number;
  sourceFragment: string;
  isConfirmed: boolean;
  confirmedEventId?: string | null;
  createdAt: string;
}

export interface DailyAnalytics {
  childId: string;
  date: string;
  counts: {
    feeding: number;
    sleep: number;
    diaper: number;
    symptom: number;
  };
  feedingVolumeMl: number;
  sleepMinutes: number;
}

export interface WeeklyAnalytics {
  childId: string;
  from: string;
  to: string;
  countsByType: Array<{ type: string; count: number }>;
}

export interface ApiErrorBody {
  error: {
    statusCode: number;
    code: string;
    message: string;
    path?: string;
    timestamp?: string;
  };
}

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  feeding: "Feeding",
  sleep: "Sleep",
  diaper: "Diaper",
  symptom: "Symptom",
  medication: "Medication",
  measurement: "Measurement",
  doctor_visit: "Doctor visit",
  lab_result: "Lab result",
  note: "Note"
};

export const MVP_EVENT_TYPES: EventType[] = [
  "feeding",
  "sleep",
  "diaper",
  "symptom",
  "measurement",
  "medication",
  "doctor_visit",
  "lab_result",
  "note"
];
