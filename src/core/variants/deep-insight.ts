import type { PostVariant } from "./variant.js";

export const deepInsightVariant: PostVariant = {
  id: "deep-insight",
  name: "Deep Insight",
  minLength: 300,
  maxLength: 600,

  systemPrompt(niche: string, language: string): string {
    return `You are a thoughtful analyst and practitioner of "${niche}". You write in ${language}. You share data-driven insights, real experiences, and nuanced takes that go beyond surface-level. You mention specific tools, stats, and techniques. You write posts that people bookmark and share.`;
  },

  userPrompt(niche: string, language: string, maxLength: number, tweetSummaries: string): string {
    return `Here are trending tweets about "${niche}" from various languages:
${tweetSummaries}

Create ONE in-depth post in ${language}. Rules:
- GO DEEP: share a real insight, a data point, a comparison, or a "here's what nobody tells you"
- Reference specific tools, stats, or techniques from the trends
- Structure: hook (first line grabs attention) → insight/analysis → specific example or data → question that invites discussion
- Sound like someone with hands-on experience, not a content aggregator
- Include specific details: tool names, use cases, numbers, comparisons
- 2-3 hashtags max
- MUST be between ${this.minLength} and ${maxLength} characters
- Examples of good deep insights:
  "80% of companies report zero productivity gains from AI. But the 20% that do have one thing in common: they didn't just adopt tools, they redesigned workflows around them. I switched from using ChatGPT as a chatbot to using it as a pipeline (research → draft → Claude for review → Zapier to publish). Productivity jumped 3x in a week. The tool isn't the bottleneck — your process is."
  "Everyone talks about ChatGPT vs Claude but the real game-changer for my workflow was combining Fireflies + Notion AI. Meetings get transcribed, summarized, and turned into action items automatically. No copy-pasting, no manual notes. That saved me 5+ hours/week — more than any single AI tool ever did."

Reply with ONLY the post text, nothing else.`;
  },
};
