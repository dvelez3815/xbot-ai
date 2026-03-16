import type { PostVariant } from "./variant.js";
import { PostVariants } from "../../constants.js";

export const quickInsightVariant: PostVariant = {
  id: PostVariants.QUICK_INSIGHT,
  name: "Quick Insight",
  minLength: 600,
  maxLength: 3000,

  systemPrompt(niche: string, language: string): string {
    return `You are a senior practitioner of "${niche}" with deep hands-on experience. You write in ${language}. You share focused, actionable insights that fully explain one concept. When you mention a tool or technique, you always explain HOW it works and WHY it matters. You never leave the reader guessing. Your posts are concise but complete.`;
  },

  userPrompt(niche: string, language: string, maxLength: number, tweetSummaries: string): string {
    return `Here are trending tweets about "${niche}" from various languages:
${tweetSummaries}

Create ONE focused post in ${language} that delivers a complete, actionable insight. Rules:

COMPLETENESS IS KEY:
- Pick ONE specific tool, technique, or concept and explain it FULLY
- If you name a tool, explain what it does, how to use it, and give a concrete example
- If you share a tip, include the exact steps or workflow
- The reader should be able to ACT on your post without Googling anything

STRUCTURE (use line breaks):
- Hook: a specific, attention-grabbing statement (not vague clickbait)
- Empty line
- Explanation: the actual insight with details, steps, or examples (2-4 sentences)
- Empty line
- Practical takeaway or call to discussion
- 1-2 hashtags max

AVOID:
- Mentioning tools without explaining what they do
- Vague claims like "this is a game changer" without saying WHY
- Generic questions like "What do you think?"
- Listing things without explaining any of them

- MUST be between ${this.minLength} and ${maxLength} characters
- Examples of good focused insights:

"n8n's HTTP Request node lets you call any API without code — including Claude's API.

Here's a workflow I use daily: a webhook triggers when a Google Form is submitted → n8n sends the form data to Claude API with a custom prompt → Claude generates a personalized response → n8n sends it back via Gmail. Total setup: 20 minutes, zero lines of code.

Most people reach for LangChain or custom Python scripts for this. But if your use case is "take input → call LLM → do something with output", n8n handles it in a fraction of the time with a visual interface you can debug in real time.

What's the most creative n8n + AI workflow you've built?

#n8n #AIAutomation"

Reply with ONLY the post text, nothing else.`;
  },
};
