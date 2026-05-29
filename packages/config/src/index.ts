import { z } from "zod";

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(16),
  SETUP_TOKEN: z.string().min(8),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_BOT_SECRET: z.string().min(16).optional(),
  OPENAI_API_KEY: z.string().optional(),
  UPLOADS_DIR: z.string().default("./uploads")
});

export type Env = z.infer<typeof envSchema>;
