/**
 * Centralized configuration — single source of truth for all env vars.
 * Validated with Zod at startup. Fails fast on invalid config.
 */

import process from "node:process";
import { z } from "zod";

// ─── Schema ──────────────────────────────────────────────

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  PORT: z.coerce.number().default(8080),

  CLIENT_URL: z.string().url().default("http://localhost:3000"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  REDIS_URL: z.string().default("redis://localhost:6379"),

  GROQ_API_KEY: z.string().default(""),

  MCP_WORKSPACE_PATH: z.string().default("./workspace"),

  APPROVAL_TIMEOUT_MS: z.coerce.number().default(300_000), // 5 min

  /** Optional second HTTP port exposing only POST /api/public/scrape (Lead Intelligence). */
  INTELLIGENCE_PORT: z.coerce.number().int().positive().optional(),

  /** Optional — enables Context7 MCP row in DB when set (see seed). */
  CONTEXT7_API_KEY: z.string().optional(),

  /** External scraper microservice URL (default http://localhost:4001). */
  SCRAPER_SERVICE_URL: z.string().url().default("http://localhost:4001"),
});

// ─── Types ───────────────────────────────────────────────

export type EnvConfig = z.infer<typeof envSchema>;

// ─── Singleton ───────────────────────────────────────────

let _config: EnvConfig | undefined;

export function getConfig(): EnvConfig {
  if (_config === undefined) {
    const result = envSchema.safeParse(process.env);

    if (!result.success) {
      console.error("❌ Invalid environment variables:");
      console.error(JSON.stringify(result.error.format(), null, 2));
      process.exit(1);
    }

    _config = result.data;
  }

  return _config;
}
