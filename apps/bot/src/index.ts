import { Telegraf } from "telegraf";

const token = process.env.TELEGRAM_BOT_TOKEN;
const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:3001";
const familyId = process.env.DEV_FAMILY_ID;
const childId = process.env.DEV_CHILD_ID;
const createdById = process.env.DEV_USER_ID;

if (!token) {
  // Intentional non-throw for local dev scaffolding.
  // Bot process can still be started after env setup.
  console.log("TELEGRAM_BOT_TOKEN is not configured");
  process.exit(0);
}

const bot = new Telegraf(token);

async function createEvent(type: string, details: Record<string, unknown>, note?: string) {
  if (!familyId || !childId || !createdById) {
    return { ok: false, reason: "DEV_FAMILY_ID, DEV_CHILD_ID and DEV_USER_ID are required" };
  }
  const response = await fetch(`${apiBaseUrl}/events`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      familyId,
      childId,
      createdById,
      type,
      source: "telegram",
      occurredAt: new Date().toISOString(),
      details,
      note
    })
  });
  return response.json();
}

async function createRawInput(text: string, telegramChatId?: string) {
  if (!familyId || !childId) {
    return { ok: false, reason: "DEV_FAMILY_ID and DEV_CHILD_ID are required" };
  }
  const response = await fetch(`${apiBaseUrl}/raw-inputs`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      familyId,
      childId,
      source: "telegram",
      text,
      telegramChatId
    })
  });
  return response.json();
}

bot.start((ctx) => ctx.reply("Baby Tracker bot connected"));
bot.command("feed", async (ctx) => {
  await createEvent("feeding", { kind: "breast" });
  await ctx.reply("Кормление сохранено");
});
bot.command("sleep_start", async (ctx) => {
  await createEvent("sleep", { startAt: new Date().toISOString() });
  await ctx.reply("Сон начался");
});
bot.command("sleep_end", async (ctx) => {
  await createRawInput("sleep_end", String(ctx.chat?.id));
  await ctx.reply("Сон завершен. Проверь timeline в Web, если нужно уточнить время начала.");
});
bot.command("diaper", async (ctx) => {
  await createEvent("diaper", { kind: "mixed" });
  await ctx.reply("Diaper событие сохранено");
});
bot.command("note", async (ctx) => {
  const text = ctx.message.text.replace("/note", "").trim();
  await createEvent("note", { text }, text);
  await ctx.reply("Заметка сохранена");
});
bot.on("text", async (ctx) => {
  await createRawInput(ctx.message.text, String(ctx.chat.id));
  await ctx.reply("Сообщение сохранено как raw input. LLM создаст черновик для подтверждения.");
});

void bot.launch();
