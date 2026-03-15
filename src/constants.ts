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
