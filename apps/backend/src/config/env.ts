import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { z } from "zod";

// Load the monorepo root .env when running locally (Docker injects env directly).
// Walk up from this file to find the first .env.
const here = dirname(fileURLToPath(import.meta.url));
for (const candidate of [
  resolve(process.cwd(), ".env"),
  resolve(here, "../../.env"),
  resolve(here, "../../../../.env"),
]) {
  if (existsSync(candidate)) {
    dotenv.config({ path: candidate });
    break;
  }
}

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  BACKEND_PORT: z.coerce.number().default(4000),

  DATABASE_URL: z.string().min(1),

  REDIS_HOST: z.string().default("localhost"),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_URL: z.string().default("redis://localhost:6379"),

  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL: z.string().default("7d"),

  SEED_ADMIN_NAME: z.string().default("Admin"),
  SEED_ADMIN_EMAIL: z.string().email().default("admin@zahira.com"),
  SEED_ADMIN_PASSWORD: z.string().min(6).default("ChangeMe123!"),

  AI_PROVIDER: z.enum(["openai"]).default("openai"),
  OPENAI_API_KEY: z.string().default(""),
  OPENAI_CHAT_MODEL: z.string().default("gpt-5.5"),
  OPENAI_EMBEDDING_MODEL: z.string().default("text-embedding-3-small"),
  OPENAI_EMBEDDING_DIMENSIONS: z.coerce.number().default(1536),

  SENDPULSE_WEBHOOK_SECRET: z.string().default("change_me_webhook_secret"),

  LOG_LEVEL: z.string().default("info"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error(
    "Invalid environment variables:",
    JSON.stringify(parsed.error.flatten().fieldErrors, null, 2),
  );
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
