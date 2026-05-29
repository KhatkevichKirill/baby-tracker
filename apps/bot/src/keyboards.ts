import { Markup } from "telegraf";
import type { InlineKeyboardMarkup } from "telegraf/types";

export const mainMenuKeyboard = (): { reply_markup: InlineKeyboardMarkup } =>
  Markup.inlineKeyboard([
    [
      Markup.button.callback("🍼 Кормление", "cmd:feed"),
      Markup.button.callback("😴 Сон начался", "cmd:sleep_start")
    ],
    [
      Markup.button.callback("⏰ Сон закончился", "cmd:sleep_end"),
      Markup.button.callback("🧷 Подгузник", "cmd:diaper")
    ],
    [
      Markup.button.callback("🌡 Температура", "cmd:temp"),
      Markup.button.callback("📝 Заметка", "cmd:note")
    ]
  ]);

export const draftActionsKeyboard = (draftId: string): { reply_markup: InlineKeyboardMarkup } =>
  Markup.inlineKeyboard([
    [
      Markup.button.callback("Сохранить", `draft:confirm:${draftId}`),
      Markup.button.callback("Исправить", `draft:edit:${draftId}`)
    ],
    [Markup.button.callback("Отменить", `draft:cancel:${draftId}`)]
  ]);

export const diaperKindKeyboard = (): { reply_markup: InlineKeyboardMarkup } =>
  Markup.inlineKeyboard([
    [
      Markup.button.callback("Моча", "diaper:urine"),
      Markup.button.callback("Кал", "diaper:stool")
    ],
    [Markup.button.callback("Смешанный", "diaper:mixed")]
  ]);

export const feedingKindKeyboard = (): { reply_markup: InlineKeyboardMarkup } =>
  Markup.inlineKeyboard([
    [
      Markup.button.callback("Грудь", "feed:breast"),
      Markup.button.callback("Смесь", "feed:formula")
    ],
    [
      Markup.button.callback("Сцеженное", "feed:expressed"),
      Markup.button.callback("Прикорм", "feed:solid")
    ]
  ]);
