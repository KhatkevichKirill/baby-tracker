"use client";

import { useMemo, useState } from "react";
import {
  diaperEventDetailsSchema,
  feedingEventDetailsSchema,
  measurementEventDetailsSchema,
  sleepEventDetailsSchema,
  symptomEventDetailsSchema
} from "@baby-tracker/shared";
import type { EventType } from "@/lib/types";
import { EVENT_TYPE_LABELS, MVP_EVENT_TYPES } from "@/lib/types";
import { fromDatetimeLocalValue, toDatetimeLocalValue } from "@/lib/utils";

export interface EventFormValues {
  type: EventType;
  occurredAt: string;
  note: string;
  details: Record<string, unknown>;
}

interface EventFormProps {
  initialValues?: Partial<EventFormValues>;
  submitLabel: string;
  lockType?: boolean;
  onSubmit: (values: EventFormValues) => Promise<void>;
}

function emptyDetails(type: EventType): Record<string, unknown> {
  switch (type) {
    case "feeding":
      return { kind: "breast" };
    case "sleep":
      return { startAt: new Date().toISOString(), quality: "normal" };
    case "diaper":
      return { kind: "stool" };
    case "symptom":
      return { symptomType: "" };
    case "measurement":
      return {};
    case "medication":
      return { name: "", dose: "" };
    case "doctor_visit":
      return { provider: "", reason: "" };
    case "lab_result":
      return { testName: "", result: "" };
    case "note":
      return { text: "" };
    default:
      return {};
  }
}

export function EventForm({
  initialValues,
  submitLabel,
  lockType = false,
  onSubmit
}: EventFormProps) {
  const [type, setType] = useState<EventType>(initialValues?.type ?? "feeding");
  const [occurredAt, setOccurredAt] = useState(
    toDatetimeLocalValue(initialValues?.occurredAt)
  );
  const [note, setNote] = useState(initialValues?.note ?? "");
  const [details, setDetails] = useState<Record<string, unknown>>(
    initialValues?.details ?? emptyDetails(initialValues?.type ?? "feeding")
  );
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const detailFields = useMemo(() => {
    switch (type) {
      case "feeding":
        return (
          <>
            <div className="field">
              <label htmlFor="kind">Kind</label>
              <select
                id="kind"
                value={String(details.kind ?? "breast")}
                onChange={(event) => setDetails({ ...details, kind: event.target.value })}
              >
                <option value="breast">Breast</option>
                <option value="formula">Formula</option>
                <option value="expressed">Expressed</option>
                <option value="solid">Solid</option>
              </select>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="field">
                <label htmlFor="volumeMl">Volume (ml)</label>
                <input
                  id="volumeMl"
                  type="number"
                  min="0"
                  value={details.volumeMl != null ? String(details.volumeMl) : ""}
                  onChange={(event) =>
                    setDetails({
                      ...details,
                      volumeMl: event.target.value ? Number(event.target.value) : undefined
                    })
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="durationMin">Duration (min)</label>
                <input
                  id="durationMin"
                  type="number"
                  min="0"
                  value={details.durationMin != null ? String(details.durationMin) : ""}
                  onChange={(event) =>
                    setDetails({
                      ...details,
                      durationMin: event.target.value ? Number(event.target.value) : undefined
                    })
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="breastSide">Breast side</label>
                <select
                  id="breastSide"
                  value={String(details.breastSide ?? "")}
                  onChange={(event) =>
                    setDetails({
                      ...details,
                      breastSide: event.target.value || undefined
                    })
                  }
                >
                  <option value="">Not set</option>
                  <option value="left">Left</option>
                  <option value="right">Right</option>
                  <option value="both">Both</option>
                </select>
              </div>
            </div>
          </>
        );
      case "sleep":
        return (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="field">
                <label htmlFor="startAt">Start</label>
                <input
                  id="startAt"
                  type="datetime-local"
                  value={toDatetimeLocalValue(String(details.startAt ?? ""))}
                  onChange={(event) =>
                    setDetails({ ...details, startAt: fromDatetimeLocalValue(event.target.value) })
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="endAt">End</label>
                <input
                  id="endAt"
                  type="datetime-local"
                  value={details.endAt ? toDatetimeLocalValue(String(details.endAt)) : ""}
                  onChange={(event) =>
                    setDetails({
                      ...details,
                      endAt: event.target.value
                        ? fromDatetimeLocalValue(event.target.value)
                        : undefined
                    })
                  }
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="field">
                <label htmlFor="quality">Quality</label>
                <select
                  id="quality"
                  value={String(details.quality ?? "normal")}
                  onChange={(event) => setDetails({ ...details, quality: event.target.value })}
                >
                  <option value="good">Good</option>
                  <option value="normal">Normal</option>
                  <option value="poor">Poor</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="location">Location</label>
                <input
                  id="location"
                  value={String(details.location ?? "")}
                  onChange={(event) => setDetails({ ...details, location: event.target.value })}
                />
              </div>
            </div>
          </>
        );
      case "diaper":
        return (
          <>
            <div className="field">
              <label htmlFor="diaperKind">Kind</label>
              <select
                id="diaperKind"
                value={String(details.kind ?? "stool")}
                onChange={(event) => setDetails({ ...details, kind: event.target.value })}
              >
                <option value="stool">Stool</option>
                <option value="urine">Urine</option>
                <option value="mixed">Mixed</option>
              </select>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="field">
                <label htmlFor="color">Color</label>
                <input
                  id="color"
                  value={String(details.color ?? "")}
                  onChange={(event) => setDetails({ ...details, color: event.target.value })}
                />
              </div>
              <div className="field">
                <label htmlFor="consistency">Consistency</label>
                <input
                  id="consistency"
                  value={String(details.consistency ?? "")}
                  onChange={(event) => setDetails({ ...details, consistency: event.target.value })}
                />
              </div>
            </div>
          </>
        );
      case "symptom":
        return (
          <>
            <div className="field">
              <label htmlFor="symptomType">Symptom</label>
              <input
                id="symptomType"
                value={String(details.symptomType ?? "")}
                onChange={(event) => setDetails({ ...details, symptomType: event.target.value })}
                placeholder="e.g. cough, rash"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="field">
                <label htmlFor="temperatureC">Temperature (°C)</label>
                <input
                  id="temperatureC"
                  type="number"
                  step="0.1"
                  value={details.temperatureC != null ? String(details.temperatureC) : ""}
                  onChange={(event) =>
                    setDetails({
                      ...details,
                      temperatureC: event.target.value ? Number(event.target.value) : undefined
                    })
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="intensity">Intensity (1-10)</label>
                <input
                  id="intensity"
                  type="number"
                  min="1"
                  max="10"
                  value={details.intensity != null ? String(details.intensity) : ""}
                  onChange={(event) =>
                    setDetails({
                      ...details,
                      intensity: event.target.value ? Number(event.target.value) : undefined
                    })
                  }
                />
              </div>
            </div>
          </>
        );
      case "measurement":
        return (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="field">
              <label htmlFor="weightKg">Weight (kg)</label>
              <input
                id="weightKg"
                type="number"
                step="0.01"
                value={details.weightKg != null ? String(details.weightKg) : ""}
                onChange={(event) =>
                  setDetails({
                    ...details,
                    weightKg: event.target.value ? Number(event.target.value) : undefined
                  })
                }
              />
            </div>
            <div className="field">
              <label htmlFor="heightCm">Height (cm)</label>
              <input
                id="heightCm"
                type="number"
                step="0.1"
                value={details.heightCm != null ? String(details.heightCm) : ""}
                onChange={(event) =>
                  setDetails({
                    ...details,
                    heightCm: event.target.value ? Number(event.target.value) : undefined
                  })
                }
              />
            </div>
            <div className="field">
              <label htmlFor="headCircumferenceCm">Head circumference (cm)</label>
              <input
                id="headCircumferenceCm"
                type="number"
                step="0.1"
                value={details.headCircumferenceCm != null ? String(details.headCircumferenceCm) : ""}
                onChange={(event) =>
                  setDetails({
                    ...details,
                    headCircumferenceCm: event.target.value
                      ? Number(event.target.value)
                      : undefined
                  })
                }
              />
            </div>
            <div className="field">
              <label htmlFor="measurementTemp">Temperature (°C)</label>
              <input
                id="measurementTemp"
                type="number"
                step="0.1"
                value={details.temperatureC != null ? String(details.temperatureC) : ""}
                onChange={(event) =>
                  setDetails({
                    ...details,
                    temperatureC: event.target.value ? Number(event.target.value) : undefined
                  })
                }
              />
            </div>
          </div>
        );
      case "medication":
        return (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="field">
              <label htmlFor="medicationName">Medication</label>
              <input
                id="medicationName"
                value={String(details.name ?? "")}
                onChange={(event) => setDetails({ ...details, name: event.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="dose">Dose</label>
              <input
                id="dose"
                value={String(details.dose ?? "")}
                onChange={(event) => setDetails({ ...details, dose: event.target.value })}
              />
            </div>
          </div>
        );
      case "doctor_visit":
        return (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="field">
              <label htmlFor="provider">Provider</label>
              <input
                id="provider"
                value={String(details.provider ?? "")}
                onChange={(event) => setDetails({ ...details, provider: event.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="reason">Reason</label>
              <input
                id="reason"
                value={String(details.reason ?? "")}
                onChange={(event) => setDetails({ ...details, reason: event.target.value })}
              />
            </div>
          </div>
        );
      case "lab_result":
        return (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="field">
              <label htmlFor="testName">Test name</label>
              <input
                id="testName"
                value={String(details.testName ?? "")}
                onChange={(event) => setDetails({ ...details, testName: event.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="result">Result</label>
              <input
                id="result"
                value={String(details.result ?? "")}
                onChange={(event) => setDetails({ ...details, result: event.target.value })}
              />
            </div>
          </div>
        );
      case "note":
        return (
          <div className="field">
            <label htmlFor="text">Observation</label>
            <textarea
              id="text"
              value={String(details.text ?? "")}
              onChange={(event) => setDetails({ ...details, text: event.target.value })}
              placeholder="Record what you observed. No medical advice."
            />
          </div>
        );
      default:
        return null;
    }
  }, [type, details]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setValidationError(null);

    const payload: EventFormValues = {
      type,
      occurredAt: fromDatetimeLocalValue(occurredAt),
      note,
      details
    };

    try {
      switch (type) {
        case "feeding":
          feedingEventDetailsSchema.parse(details);
          break;
        case "sleep":
          sleepEventDetailsSchema.parse(details);
          break;
        case "diaper":
          diaperEventDetailsSchema.parse(details);
          break;
        case "symptom":
          symptomEventDetailsSchema.parse(details);
          break;
        case "measurement":
          measurementEventDetailsSchema.parse(details);
          break;
        default:
          break;
      }
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : "Invalid event details");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(payload);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="card space-y-5 p-5" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="field">
          <label htmlFor="type">Event type</label>
          <select
            id="type"
            value={type}
            disabled={lockType}
            onChange={(event) => {
              const nextType = event.target.value as EventType;
              setType(nextType);
              setDetails(emptyDetails(nextType));
            }}
          >
            {MVP_EVENT_TYPES.map((item) => (
              <option key={item} value={item}>
                {EVENT_TYPE_LABELS[item]}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="occurredAt">Occurred at</label>
          <input
            id="occurredAt"
            type="datetime-local"
            value={occurredAt}
            onChange={(event) => setOccurredAt(event.target.value)}
            required
          />
        </div>
      </div>

      {detailFields}

      <div className="field">
        <label htmlFor="note">Note</label>
        <textarea
          id="note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Optional observation or context"
        />
      </div>

      {validationError ? <div className="alert alert-error">{validationError}</div> : null}

      <div className="flex justify-end">
        <button className="btn btn-primary" disabled={submitting} type="submit">
          {submitting ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
