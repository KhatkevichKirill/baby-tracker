import type { Context, MiddlewareFn } from "telegraf";
import type { ApiClient, BotSession } from "./api-client";

const sessionCache = new Map<string, BotSession>();

export function getCachedSession(telegramUserId: string) {
  return sessionCache.get(telegramUserId);
}

export function setCachedSession(telegramUserId: string, session: BotSession) {
  sessionCache.set(telegramUserId, session);
}

export async function resolveSession(
  api: ApiClient,
  telegramUserId: string
): Promise<BotSession | null> {
  const cached = getCachedSession(telegramUserId);
  if (cached) return cached;

  const result = await api.getContext(telegramUserId);
  if (!result.ok) return null;

  setCachedSession(telegramUserId, result.data);
  return result.data;
}

export function requireLinkedUser(api: ApiClient): MiddlewareFn<Context> {
  return async (ctx, next) => {
    const telegramUserId = String(ctx.from?.id ?? "");
    if (!telegramUserId) {
      await ctx.reply("Не удалось определить Telegram user id.");
      return;
    }

    const session = await resolveSession(api, telegramUserId);
    if (!session) {
      await ctx.reply(
        "Аккаунт не привязан. Получите одноразовый код в Web и отправьте:\n/link КОД"
      );
      return;
    }

    ctx.state.session = session;
    await next();
  };
}

export type BotContext = Context & {
  state: {
    session?: BotSession;
    pendingAction?: "note" | "temp" | "draft_edit";
    pendingDraftId?: string;
  };
};
