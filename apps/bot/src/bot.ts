import { Telegraf } from "telegraf";
import { ApiClient } from "./api-client";
import { registerHandlers } from "./handlers";
import type { BotContext } from "./session";

export type CreateBotOptions = {
  token: string;
  apiBaseUrl: string;
  botSecret: string;
};

export function createBot(options: CreateBotOptions) {
  const api = new ApiClient({
    apiBaseUrl: options.apiBaseUrl,
    botSecret: options.botSecret
  });
  const bot = new Telegraf<BotContext>(options.token);
  registerHandlers(bot, api);
  return bot;
}

export { ApiClient } from "./api-client";
export type { BotSession } from "./api-client";
