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

function parseBool(value: string): boolean {
  return value === "true" || value === "1";
}

function parseNumberList(value: string): number[] {
  return value.split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n));
}

export function loadConfig(): AppConfig {
  const provider = optionalEnv("AI_PROVIDER", "ollama") as "ollama" | "anthropic";

  return {
    x: {
      bearerToken: requireEnv("X_BEARER_TOKEN"),
      apiKey: requireEnv("X_API_KEY"),
      apiSecret: requireEnv("X_API_SECRET"),
      accessToken: requireEnv("X_ACCESS_TOKEN"),
      accessSecret: requireEnv("X_ACCESS_SECRET"),
    },
    ai: {
      provider,
      baseUrl: optionalEnv("AI_BASE_URL", provider === "ollama" ? "http://localhost:11434" : "https://api.anthropic.com"),
      apiKey: optionalEnv("AI_API_KEY", ""),
      model: optionalEnv("AI_MODEL", provider === "ollama" ? "qwen3.5:9b" : "claude-sonnet-4-20250514"),
    },
    bot: {
      niche: optionalEnv("BOT_NICHE", "technology"),
      language: optionalEnv("BOT_LANGUAGE", "es"),
      searchLanguages: optionalEnv("BOT_SEARCH_LANGUAGES", "en,pt").split(",").map((s) => s.trim()),
      maxResultsPerSearch: parseInt(optionalEnv("BOT_MAX_RESULTS_PER_SEARCH", "10"), 10),
      expandAuthors: parseBool(optionalEnv("BOT_EXPAND_AUTHORS", "false")),
      postsPerDay: parseInt(optionalEnv("BOT_POSTS_PER_DAY", "4"), 10),
      minIntervalMinutes: parseInt(optionalEnv("BOT_MIN_INTERVAL_MINUTES", "45"), 10),
      maxIntervalMinutes: parseInt(optionalEnv("BOT_MAX_INTERVAL_MINUTES", "180"), 10),
      peakHours: parseNumberList(optionalEnv("BOT_PEAK_HOURS", "9,12,15,18,20")),
    },
  };
}
