export type PendingAction =
  | { type: "note" }
  | { type: "temp" }
  | { type: "draft_edit"; draftId: string };

const pendingByUser = new Map<string, PendingAction>();

export function setPendingAction(telegramUserId: string, action: PendingAction) {
  pendingByUser.set(telegramUserId, action);
}

export function getPendingAction(telegramUserId: string) {
  return pendingByUser.get(telegramUserId);
}

export function clearPendingAction(telegramUserId: string) {
  pendingByUser.delete(telegramUserId);
}

export function resetPendingActionsForTests() {
  pendingByUser.clear();
}

export function resolvePendingTextInput(
  telegramUserId: string,
  text: string,
  parseTemperature: (value: string) => number | null
):
  | { kind: "none" }
  | { kind: "note"; text: string }
  | { kind: "temp"; value: number }
  | { kind: "temp_invalid" }
  | { kind: "draft_edit"; text: string; draftId: string } {
  const pending = getPendingAction(telegramUserId);
  if (!pending) {
    return { kind: "none" };
  }

  if (pending.type === "note") {
    clearPendingAction(telegramUserId);
    return { kind: "note", text };
  }

  if (pending.type === "temp") {
    const value = parseTemperature(text);
    clearPendingAction(telegramUserId);
    if (value == null) {
      return { kind: "temp_invalid" };
    }
    return { kind: "temp", value };
  }

  if (pending.type === "draft_edit") {
    const draftId = pending.draftId;
    clearPendingAction(telegramUserId);
    return { kind: "draft_edit", text, draftId };
  }

  return { kind: "none" };
}
