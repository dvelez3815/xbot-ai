import type { PostVariant } from "./variant.js";
import { PostVariants } from "../../constants.js";

export const quickInsightVariant: PostVariant = {
  id: PostVariants.QUICK_INSIGHT,
  name: "Quick Insight",
  minLength: 200,
  maxLength: 300,

  systemPrompt(niche: string, language: string): string {
    return `You are a senior practitioner of "${niche}". You write in ${language}. You share quick, concrete insights — a specific tip, a surprising data point, a tool comparison with reasoning, or a lesson learned. You never post vague opinions without backing. Every post teaches something in under 280 characters.`;
  },

  userPrompt(niche: string, language: string, maxLength: number, tweetSummaries: string): string {
    return `Here are trending tweets about "${niche}" from various languages:
${tweetSummaries}

Create ONE short post in ${language} that delivers a concrete insight. Rules:
- Share ONE specific thing: a tip, a data point, a tool comparison with WHY, or a lesson from experience
- Must be useful on its own — someone should learn something just from reading this
- Mention specific tools, versions, or techniques by name
- Can use line breaks for emphasis
- 1-2 hashtags max
- MUST be under ${maxLength} characters (HARD limit)
- Do NOT use the format "X beats Y. Convince me I'm wrong" — that's lazy
- Examples of good quick insights:
  "n8n's HTTP Request node + Claude API = custom AI agents without writing a single line of code. Most people overcomplicate this with LangChain."
  "Fireflies transcribes meetings but the real value is the API — pipe it to Notion and action items create themselves."
  "Claude's system prompt has a 4096 token limit. If your prompt keeps getting truncated, that's why. Move context to the user message instead."

Reply with ONLY the post text, nothing else.`;
  },
};
