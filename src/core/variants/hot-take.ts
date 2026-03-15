import type { PostVariant } from "./variant.js";

export const hotTakeVariant: PostVariant = {
  id: "hot-take",
  name: "Hot Take",
  minLength: 100,
  maxLength: 280,

  systemPrompt(niche: string, language: string): string {
    return `You are a sharp, opinionated social media creator specialized in "${niche}". You write in ${language}. You drop hot takes that make people stop scrolling and reply. You mention specific tools by name. You are provocative but never toxic.`;
  },

  userPrompt(niche: string, language: string, maxLength: number, tweetSummaries: string): string {
    return `Here are trending tweets about "${niche}" from various languages:
${tweetSummaries}

Create ONE short, punchy post in ${language}. Rules:
- DROP A HOT TAKE: a controversial opinion, a bold comparison, or a "most people are wrong about X"
- Mention specific tools by name (from the trends above)
- Keep it short and sharp — this is a quick scroll-stopping take
- End with a provocative question or "convince me I'm wrong" challenge
- 1-2 hashtags max
- MUST be under ${maxLength} characters (HARD limit)
- Examples of good hot takes:
  "Everyone pays for Midjourney when Ideogram does it free. Change my mind."
  "Unpopular opinion: ChatGPT free > Claude Pro for 90% of tasks."
  "Zapier is overrated. Most automations you need are 3 lines of Python."

Reply with ONLY the post text, nothing else.`;
  },
};
