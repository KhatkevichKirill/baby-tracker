import { Telegraf } from "telegraf";
import type { ApiClient } from "../api-client";
import { formatApiError, parseTemperature } from "../format";
import {
  clearPendingAction,
  resolvePendingTextInput,
  setPendingAction
} from "../pending-actions";
import {
  createStructuredEvent,
  sendDailySummary,
  submitRawInput,
  welcomeText
} from "./actions";
import {
  diaperKindKeyboard,
  feedingKindKeyboard,
  mainMenuKeyboard
} from "../keyboards";
import {
  requireLinkedUser,
  setCachedSession,
  type BotContext
} from "../session";

function telegramUserIdFrom(ctx: BotContext) {
  return String(ctx.from?.id ?? "");
}

export function registerHandlers(bot: Telegraf<BotContext>, api: ApiClient) {
  bot.start(async (ctx) => {
    await ctx.reply(welcomeText(), mainMenuKeyboard());
  });

  bot.command("help", async (ctx) => {
    await ctx.reply(welcomeText(), mainMenuKeyboard());
  });

  bot.command("link", async (ctx) => {
    const telegramUserId = telegramUserIdFrom(ctx);
    const parts = ("text" in ctx.message ? ctx.message.text : "").trim().split(/\s+/);
    const code = parts[1];
    if (!code) {
      await ctx.reply("Использование: /link КОД");
      return;
    }

    const linked = await api.redeemLink(code, telegramUserId, String(ctx.chat?.id));
    if (!linked.ok) {
      await ctx.reply(formatApiError(linked.message));
      return;
    }

    setCachedSession(telegramUserId, linked.data);
    await ctx.reply(
      `Аккаунт привязан. Активный ребенок: ${linked.data.childName}.`,
      mainMenuKeyboard()
    );
  });

  bot.use(requireLinkedUser(api));

  bot.command("feed", async (ctx) => {
    await ctx.reply("Выберите тип кормления:", feedingKindKeyboard());
  });

  bot.command("sleep_start", async (ctx) => {
    await createStructuredEvent(
      api,
      ctx.state.session!,
      "sleep",
      { startAt: new Date().toISOString() },
      "Сон начался",
      (text) => ctx.reply(text)
    );
  });

  bot.command("sleep_end", async (ctx) => {
    await submitRawInput(
      api,
      ctx.state.session!,
      "Сон закончился",
      String(ctx.chat.id),
      (text, extra) => ctx.reply(text, extra)
    );
  });

  bot.command("diaper", async (ctx) => {
    await ctx.reply("Выберите тип подгузника:", diaperKindKeyboard());
  });

  bot.command("temp", async (ctx) => {
    const telegramUserId = telegramUserIdFrom(ctx);
    const text = "text" in ctx.message ? ctx.message.text : "";
    const value = parseTemperature(text.replace("/temp", ""));
    if (value == null) {
      setPendingAction(telegramUserId, { type: "temp" });
      await ctx.reply("Отправьте температуру, например: 37.2");
      return;
    }

    await createStructuredEvent(
      api,
      ctx.state.session!,
      "measurement",
      { temperatureC: value },
      `Температура ${value}°C`,
      (replyText) => ctx.reply(replyText)
    );
  });

  bot.command("note", async (ctx) => {
    const telegramUserId = telegramUserIdFrom(ctx);
    const text = "text" in ctx.message ? ctx.message.text.replace("/note", "").trim() : "";
    if (!text) {
      setPendingAction(telegramUserId, { type: "note" });
      await ctx.reply("Отправьте текст заметки следующим сообщением.");
      return;
    }

    await createStructuredEvent(
      api,
      ctx.state.session!,
      "note",
      { text },
      text,
      (replyText) => ctx.reply(replyText)
    );
  });

  bot.command("summary", async (ctx) => {
    await sendDailySummary(api, ctx.state.session!, (text) => ctx.reply(text));
  });

  bot.action(/^cmd:(.+)$/, async (ctx) => {
    const telegramUserId = telegramUserIdFrom(ctx);
    const action = ctx.match[1];
    await ctx.answerCbQuery();
    if (action === "feed") {
      await ctx.reply("Выберите тип кормления:", feedingKindKeyboard());
      return;
    }
    if (action === "sleep_start") {
      await createStructuredEvent(
        api,
        ctx.state.session!,
        "sleep",
        { startAt: new Date().toISOString() },
        "Сон начался",
        (text) => ctx.reply(text)
      );
      return;
    }
    if (action === "sleep_end") {
      await submitRawInput(
        api,
        ctx.state.session!,
        "Сон закончился",
        String(ctx.chat?.id),
        (text, extra) => ctx.reply(text, extra)
      );
      return;
    }
    if (action === "diaper") {
      await ctx.reply("Выберите тип подгузника:", diaperKindKeyboard());
      return;
    }
    if (action === "temp") {
      setPendingAction(telegramUserId, { type: "temp" });
      await ctx.reply("Отправьте температуру, например: 37.2");
      return;
    }
    if (action === "note") {
      setPendingAction(telegramUserId, { type: "note" });
      await ctx.reply("Отправьте текст заметки следующим сообщением.");
      return;
    }
    if (action === "summary") {
      await sendDailySummary(api, ctx.state.session!, (text) => ctx.reply(text));
    }
  });

  bot.action(/^feed:(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const kind = ctx.match[1];
    await createStructuredEvent(
      api,
      ctx.state.session!,
      "feeding",
      { kind },
      `Кормление: ${kind}`,
      (text) => ctx.reply(text)
    );
  });

  bot.action(/^diaper:(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const kind = ctx.match[1];
    await createStructuredEvent(
      api,
      ctx.state.session!,
      "diaper",
      { kind },
      `Подгузник: ${kind}`,
      (text) => ctx.reply(text)
    );
  });

  bot.action(/^draft:confirm:(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const draftId = ctx.match[1];
    const confirmed = await api.confirmDraft(ctx.state.session!, draftId);
    if (!confirmed.ok) {
      await ctx.reply(formatApiError(confirmed.message));
      return;
    }
    if (confirmed.data.source !== "telegram") {
      await ctx.reply("Событие подтверждено, но source не telegram.");
      return;
    }
    await ctx.reply("Событие сохранено.");
  });

  bot.action(/^draft:edit:(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const telegramUserId = telegramUserIdFrom(ctx);
    setPendingAction(telegramUserId, { type: "draft_edit", draftId: ctx.match[1] });
    await ctx.reply("Отправьте исправленный текст. Будет создан новый черновик.");
  });

  bot.action(/^draft:cancel:(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    clearPendingAction(telegramUserIdFrom(ctx));
    await ctx.reply("Черновик не сохранен.");
  });

  bot.on("text", async (ctx) => {
    const telegramUserId = telegramUserIdFrom(ctx);
    const text = ctx.message.text.trim();
    if (text.startsWith("/")) return;

    const pending = resolvePendingTextInput(telegramUserId, text, parseTemperature);

    if (pending.kind === "note") {
      await createStructuredEvent(
        api,
        ctx.state.session!,
        "note",
        { text: pending.text },
        pending.text,
        (replyText) => ctx.reply(replyText)
      );
      return;
    }

    if (pending.kind === "temp_invalid") {
      await ctx.reply("Не удалось распознать температуру. Пример: 37.2");
      return;
    }

    if (pending.kind === "temp") {
      await createStructuredEvent(
        api,
        ctx.state.session!,
        "measurement",
        { temperatureC: pending.value },
        `Температура ${pending.value}°C`,
        (replyText) => ctx.reply(replyText)
      );
      return;
    }

    if (pending.kind === "draft_edit") {
      await submitRawInput(
        api,
        ctx.state.session!,
        pending.text,
        String(ctx.chat.id),
        (replyText, extra) => ctx.reply(replyText, extra)
      );
      return;
    }

    await submitRawInput(
      api,
      ctx.state.session!,
      text,
      String(ctx.chat.id),
      (replyText, extra) => ctx.reply(replyText, extra)
    );
  });
}
