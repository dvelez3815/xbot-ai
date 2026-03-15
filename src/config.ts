import "dotenv/config";
import type { AppConfig } from "./types.js";
import { AIProviders, AI_PROVIDER_DEFAULTS, EnvKeys, TWEET_MAX_LENGTH_DEFAULT, type AIProviderType } from "./constants.js";
import { DEFAULT_VARIANTS } from "./core/variants/index.js";

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
  const provider = optionalEnv(EnvKeys.AI_PROVIDER, AIProviders.OLLAMA) as AIProviderType;
  const defaults = AI_PROVIDER_DEFAULTS[provider] ?? AI_PROVIDER_DEFAULTS[AIProviders.OLLAMA];

  return {
    x: {
      bearerToken: requireEnv(EnvKeys.X_BEARER_TOKEN),
      apiKey: requireEnv(EnvKeys.X_API_KEY),
      apiSecret: requireEnv(EnvKeys.X_API_SECRET),
      accessToken: requireEnv(EnvKeys.X_ACCESS_TOKEN),
      accessSecret: requireEnv(EnvKeys.X_ACCESS_SECRET),
    },
    ai: {
      provider,
      baseUrl: optionalEnv(EnvKeys.AI_BASE_URL, defaults.baseUrl),
      apiKey: optionalEnv(EnvKeys.AI_API_KEY, ""),
      model: optionalEnv(EnvKeys.AI_MODEL, defaults.model),
      timeoutSeconds: parseInt(optionalEnv(EnvKeys.AI_TIMEOUT_SECONDS, "300"), 10),
    },
    bot: {
      niche: optionalEnv(EnvKeys.BOT_NICHE, "technology"),
      language: optionalEnv(EnvKeys.BOT_LANGUAGE, "es"),
      searchLanguages: optionalEnv(EnvKeys.BOT_SEARCH_LANGUAGES, "en,pt").split(",").map((s) => s.trim()),
      maxResultsPerSearch: parseInt(optionalEnv(EnvKeys.BOT_MAX_RESULTS_PER_SEARCH, "10"), 10),
      expandAuthors: parseBool(optionalEnv(EnvKeys.BOT_EXPAND_AUTHORS, "false")),
      postMaxLength: parseInt(optionalEnv(EnvKeys.BOT_POST_MAX_LENGTH, String(TWEET_MAX_LENGTH_DEFAULT)), 10),
      postVariants: optionalEnv(EnvKeys.BOT_POST_VARIANTS, DEFAULT_VARIANTS.join(",")).split(",").map((s) => s.trim()),
      delayBetweenPostsSeconds: parseInt(optionalEnv(EnvKeys.BOT_DELAY_BETWEEN_POSTS_SECONDS, "180"), 10),
      postsPerDay: parseInt(optionalEnv(EnvKeys.BOT_POSTS_PER_DAY, "8"), 10),
      minIntervalMinutes: parseInt(optionalEnv(EnvKeys.BOT_MIN_INTERVAL_MINUTES, "45"), 10),
      maxIntervalMinutes: parseInt(optionalEnv(EnvKeys.BOT_MAX_INTERVAL_MINUTES, "180"), 10),
      peakHours: parseNumberList(optionalEnv(EnvKeys.BOT_PEAK_HOURS, "9,12,15,18,20")),
      replyEnabled: parseBool(optionalEnv(EnvKeys.BOT_REPLY_ENABLED, "false")),
      replyChancePercent: parseInt(optionalEnv(EnvKeys.BOT_REPLY_CHANCE_PERCENT, "3"), 10),
    },
  };
}
