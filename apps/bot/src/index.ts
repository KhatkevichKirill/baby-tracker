import { createBot } from "./bot";

const token = process.env.TELEGRAM_BOT_TOKEN;
const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:3001";
const botSecret = process.env.TELEGRAM_BOT_SECRET;

if (!token) {
  console.log("TELEGRAM_BOT_TOKEN is not configured");
  process.exit(0);
}

if (!botSecret) {
  console.log("TELEGRAM_BOT_SECRET is not configured");
  process.exit(1);
}

const bot = createBot({
  token,
  apiBaseUrl,
  botSecret
});

bot.launch().then(() => {
  console.log("Baby Tracker bot started in polling mode");
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
