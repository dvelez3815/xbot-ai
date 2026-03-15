import "dotenv/config";
import type { AppConfig } from "./types.js";

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optionalEnv(key: string, fallback: string): string {
  return process.env[key] || fallback;
}

function parseNumberList(value: string): number[] {
  return value.split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n));
}

export function loadConfig(): AppConfig {
  return {
    x: {
      bearerToken: requireEnv("X_BEARER_TOKEN"),
      apiKey: requireEnv("X_API_KEY"),
      apiSecret: requireEnv("X_API_SECRET"),
      accessToken: requireEnv("X_ACCESS_TOKEN"),
      accessSecret: requireEnv("X_ACCESS_SECRET"),
    },
    ai: {
      apiKey: requireEnv("ANTHROPIC_API_KEY"),
      model: optionalEnv("AI_MODEL", "claude-sonnet-4-20250514"),
    },
    bot: {
      niche: optionalEnv("BOT_NICHE", "technology"),
      language: optionalEnv("BOT_LANGUAGE", "es"),
      searchLanguages: optionalEnv("BOT_SEARCH_LANGUAGES", "en,pt,fr").split(",").map((s) => s.trim()),
      postsPerDay: parseInt(optionalEnv("BOT_POSTS_PER_DAY", "8"), 10),
      minIntervalMinutes: parseInt(optionalEnv("BOT_MIN_INTERVAL_MINUTES", "45"), 10),
      maxIntervalMinutes: parseInt(optionalEnv("BOT_MAX_INTERVAL_MINUTES", "180"), 10),
      peakHours: parseNumberList(optionalEnv("BOT_PEAK_HOURS", "9,12,15,18,20")),
    },
  };
}
