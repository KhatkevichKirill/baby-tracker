import type { ApiClient, ApiDraft, BotSession } from "../api-client";
import { formatApiError, formatDraftSummary } from "../format";
import { draftActionsKeyboard } from "../keyboards";

const DRAFT_POLL_ATTEMPTS = 12;
const DRAFT_POLL_DELAY_MS = 1000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function sendDraftsForReview(
  reply: (text: string, extra?: object) => Promise<unknown>,
  drafts: ApiDraft[]
) {
  for (const draft of drafts) {
    if (draft.isConfirmed) continue;
    await reply(formatDraftSummary(draft), draftActionsKeyboard(draft.id));
  }
}

export async function pollDraftsAfterRawInput(
  api: ApiClient,
  session: BotSession,
  rawInputId: string,
  reply: (text: string, extra?: object) => Promise<unknown>
) {
  for (let attempt = 0; attempt < DRAFT_POLL_ATTEMPTS; attempt += 1) {
    await sleep(DRAFT_POLL_DELAY_MS);
    const rawInput = await api.getRawInput(session, rawInputId);
    if (!rawInput.ok) {
      continue;
    }

    const drafts = rawInput.data.draftEvents ?? [];
    const pending = drafts.filter((draft) => !draft.isConfirmed);
    if (pending.length) {
      await sendDraftsForReview(reply, pending);
      return;
    }
  }

  await reply(
    "Сообщение сохранено. Черновик появится после обработки — проверьте Web или отправьте команду позже."
  );
}

export async function submitRawInput(
  api: ApiClient,
  session: BotSession,
  text: string,
  telegramChatId: string,
  reply: (text: string, extra?: object) => Promise<unknown>
) {
  const created = await api.createRawInput(session, text, telegramChatId);
  if (!created.ok) {
    await reply(formatApiError(created.message));
    return;
  }

  await reply("Сообщение отправлено на разбор. Жду черновик для подтверждения...");
  await pollDraftsAfterRawInput(api, session, created.data.id, reply);
}

export async function createStructuredEvent(
  api: ApiClient,
  session: BotSession,
  type: string,
  details: Record<string, unknown>,
  note: string | undefined,
  reply: (text: string, extra?: object) => Promise<unknown>
) {
  const created = await api.createEvent(session, type, details, note);
  if (!created.ok) {
    await reply(formatApiError(created.message));
    return;
  }
  if (created.data.source !== "telegram") {
    await reply("Событие создано, но source не telegram — проверьте API.");
    return;
  }
  await reply(note ?? "Событие сохранено.");
}

export function welcomeText() {
  return [
    "Baby Tracker — семейный дневник.",
    "",
    "1. Получите одноразовый код в Web.",
    "2. Отправьте /link КОД",
    "3. Используйте команды или кнопки ниже.",
    "",
    "Свободный текст не создает событие без подтверждения черновика."
  ].join("\n");
}
