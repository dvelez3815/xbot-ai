// ── AI Providers ──

export const AIProviders = {
  OLLAMA: "ollama",
  ANTHROPIC: "anthropic",
  OPENAI: "openai",
} as const;

export type AIProviderType = (typeof AIProviders)[keyof typeof AIProviders];

export const AI_PROVIDER_DEFAULTS: Record<AIProviderType, { baseUrl: string; model: string }> = {
  [AIProviders.OLLAMA]: { baseUrl: "http://localhost:11434", model: "qwen3.5:9b" },
  [AIProviders.ANTHROPIC]: { baseUrl: "https://api.anthropic.com", model: "claude-sonnet-4-20250514" },
  [AIProviders.OPENAI]: { baseUrl: "https://api.openai.com", model: "gpt-4o-mini" },
};

// ── Environment Variable Keys ──

export const EnvKeys = {
  // X/Twitter
  X_BEARER_TOKEN: "X_BEARER_TOKEN",
  X_API_KEY: "X_API_KEY",
  X_API_SECRET: "X_API_SECRET",
  X_ACCESS_TOKEN: "X_ACCESS_TOKEN",
  X_ACCESS_SECRET: "X_ACCESS_SECRET",
  // AI
  AI_PROVIDER: "AI_PROVIDER",
  AI_BASE_URL: "AI_BASE_URL",
  AI_API_KEY: "AI_API_KEY",
  AI_MODEL: "AI_MODEL",
  AI_TIMEOUT_SECONDS: "AI_TIMEOUT_SECONDS",
  // Bot
  BOT_NICHE: "BOT_NICHE",
  BOT_LANGUAGE: "BOT_LANGUAGE",
  BOT_SEARCH_LANGUAGES: "BOT_SEARCH_LANGUAGES",
  BOT_MAX_RESULTS_PER_SEARCH: "BOT_MAX_RESULTS_PER_SEARCH",
  BOT_EXPAND_AUTHORS: "BOT_EXPAND_AUTHORS",
  BOT_POSTS_PER_DAY: "BOT_POSTS_PER_DAY",
  BOT_MIN_INTERVAL_MINUTES: "BOT_MIN_INTERVAL_MINUTES",
  BOT_MAX_INTERVAL_MINUTES: "BOT_MAX_INTERVAL_MINUTES",
  BOT_PEAK_HOURS: "BOT_PEAK_HOURS",
  // System
  DEBUG: "DEBUG",
  LOG_FILE: "LOG_FILE",
} as const;

// ── X API ──

/** X API reserved operators — stripped from user queries to prevent 400 errors */
export const X_RESERVED_OPERATORS = /\b(AND|OR|NOT|and|or|not)\b/g;

/** Thinking model stop tokens — content after these is internal reasoning, not output */
export const THINKING_STOP_PATTERNS = [
  "<|endoftext|>",
  "<|im_end|>",
  "<|im_start|>",
  "</think>",
  "<think>",
  "</s>",
  "<|eot_id|>",
];

/** Tweet character limit */
export const TWEET_MAX_LENGTH = 280;

/** Max length for auto-shorten attempts (beyond this, reject outright) */
export const TWEET_SHORTEN_THRESHOLD = 400;

/** Language code to display name mapping */
export const LANGUAGE_NAMES: Record<string, string> = {
  es: "Spanish",
  en: "English",
  pt: "Portuguese",
  fr: "French",
  de: "German",
  it: "Italian",
  ja: "Japanese",
  ko: "Korean",
  zh: "Chinese",
  ar: "Arabic",
  ru: "Russian",
};
