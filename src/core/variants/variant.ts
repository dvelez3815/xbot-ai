export interface PostVariant {
  /** Unique identifier for tracking */
  id: string;
  /** Human-readable name */
  name: string;
  /** Min characters for this variant */
  minLength: number;
  /** Max characters for this variant */
  maxLength: number;
  /** System prompt for the AI */
  systemPrompt(niche: string, language: string): string;
  /** User prompt for the AI */
  userPrompt(niche: string, language: string, maxLength: number, tweetSummaries: string): string;
}
