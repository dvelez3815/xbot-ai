import { THINKING_STOP_PATTERNS } from "../constants.js";

/**
 * Strip thinking model artifacts from the response.
 * Models like Qwen 3.5, DeepSeek, etc. emit reasoning tokens after the answer.
 */
export function cleanModelOutput(raw: string): string {
  let cleaned = raw;
  for (const pattern of THINKING_STOP_PATTERNS) {
    const idx = cleaned.indexOf(pattern);
    if (idx !== -1) {
      cleaned = cleaned.slice(0, idx);
    }
  }
  return cleaned.trim();
}
