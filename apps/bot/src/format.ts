import type { ApiDraft } from "./api-client";

const TYPE_LABELS: Record<string, string> = {
  feeding: "Кормление",
  sleep: "Сон",
  diaper: "Подгузник",
  symptom: "Симптом",
  measurement: "Измерение",
  note: "Заметка"
};

export function formatDraftSummary(draft: ApiDraft) {
  const typeLabel = TYPE_LABELS[draft.type] ?? draft.type;
  const confidence = Math.round(draft.confidence * 100);
  const details = Object.entries(draft.detailsJson ?? {})
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join("\n");

  return [
    `Черновик: ${typeLabel}`,
    `Фрагмент: ${draft.sourceFragment}`,
    details ? `Детали:\n${details}` : undefined,
    `Уверенность: ${confidence}%`
  ]
    .filter(Boolean)
    .join("\n");
}

export function formatApiError(message: string) {
  return `Не удалось выполнить запрос: ${message}`;
}

export function parseTemperature(text: string) {
  const normalized = text.replace(",", ".").trim();
  const match = normalized.match(/(-?\d+(?:\.\d+)?)/);
  if (!match) return null;
  const value = Number(match[1]);
  if (!Number.isFinite(value) || value < 30 || value > 45) return null;
  return value;
}
