import { beforeEach, describe, expect, it } from "vitest";
import {
  clearPendingAction,
  getPendingAction,
  resetPendingActionsForTests,
  resolvePendingTextInput,
  setPendingAction
} from "./pending-actions";

describe("pending actions store", () => {
  const userId = "telegram-user-42";

  beforeEach(() => {
    resetPendingActionsForTests();
  });

  it("persists note pending action across updates", () => {
    setPendingAction(userId, { type: "note" });
    expect(getPendingAction(userId)).toEqual({ type: "note" });

    const resolved = resolvePendingTextInput(userId, "спит хорошо", (value) => Number(value));
    expect(resolved).toEqual({ kind: "note", text: "спит хорошо" });
    expect(getPendingAction(userId)).toBeUndefined();
  });

  it("persists temp pending action and resolves temperature on next message", () => {
    setPendingAction(userId, { type: "temp" });

    const resolved = resolvePendingTextInput(userId, "37.2", (value) => {
      const parsed = Number(value.replace(",", "."));
      return Number.isFinite(parsed) ? parsed : null;
    });

    expect(resolved).toEqual({ kind: "temp", value: 37.2 });
    expect(getPendingAction(userId)).toBeUndefined();
  });

  it("clears temp pending action on invalid input", () => {
    setPendingAction(userId, { type: "temp" });

    const resolved = resolvePendingTextInput(userId, "abc", () => null);
    expect(resolved).toEqual({ kind: "temp_invalid" });
    expect(getPendingAction(userId)).toBeUndefined();
  });

  it("persists draft_edit pending action with draft id", () => {
    setPendingAction(userId, { type: "draft_edit", draftId: "draft-1" });

    const resolved = resolvePendingTextInput(userId, "исправленный текст", () => null);
    expect(resolved).toEqual({
      kind: "draft_edit",
      text: "исправленный текст",
      draftId: "draft-1"
    });
    expect(getPendingAction(userId)).toBeUndefined();
  });

  it("clears pending action explicitly on cancel", () => {
    setPendingAction(userId, { type: "note" });
    clearPendingAction(userId);
    expect(getPendingAction(userId)).toBeUndefined();
  });
});
