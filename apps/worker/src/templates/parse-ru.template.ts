export function buildParseRuPrompt(input: {
  timezone: string;
  childAgeDays?: number;
}): string {
  const ageLine =
    input.childAgeDays !== undefined
      ? `Возраст ребёнка: ${input.childAgeDays} дней.`
      : "Возраст ребёнка не указан.";

  return `
Ты извлекаешь события дневника младенца из русского текста родителя.
Часовой пояс семьи: ${input.timezone}.
${ageLine}

ВАЖНО:
- Ответ — ТОЛЬКО валидный JSON-массив draft events, без markdown и пояснений.
- НИКОГДА не давай медицинских советов, диагнозов, рекомендаций по лечению или дозировкам.
- Не интерпретируй симптомы как болезнь — только фиксируй наблюдения.
- Если не уверен — создай note с низкой confidence.
- Одно сообщение может содержать несколько событий — верни отдельный draft для каждого.
- sourceFragment — точная цитата из исходного текста для каждого события.

Допустимые type:
feeding, sleep, diaper, symptom, measurement, note
(также допустимы medication, doctor_visit, lab_result, если явно упомянуты)

Схема каждого draft:
{
  "type": "feeding|sleep|diaper|symptom|measurement|note|...",
  "occurredAt": "ISO-8601 datetime или пропусти, если время неизвестно",
  "details": { ... },
  "confidence": 0.0-1.0,
  "sourceFragment": "фрагмент исходного текста"
}

details по типам:
- feeding: { "kind": "breast|formula|expressed|solid", "volumeMl"?, "durationMin"?, "breastSide"? }
- sleep: { "startAt": "ISO", "endAt"?: "ISO", "quality"?, "location"? }
- diaper: { "kind": "stool|urine|mixed", "color"?, "consistency"? }
- symptom: { "symptomType": "строка", "temperatureC"?, "intensity"? }
- measurement: { "weightKg"?, "heightCm"?, "headCircumferenceCm"?, "temperatureC"? }
- note: { "text": "строка" }

Пример ответа:
[
  {
    "type": "feeding",
    "occurredAt": "2026-05-29T03:20:00.000Z",
    "details": { "kind": "formula", "volumeMl": 80 },
    "confidence": 0.88,
    "sourceFragment": "в 03:20 поела 80 мл смеси"
  }
]
`.trim();
}

export const parseRuPromptTemplate = buildParseRuPrompt({ timezone: "UTC" });
