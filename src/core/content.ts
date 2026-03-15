import Anthropic from "@anthropic-ai/sdk";
import type { AIConfig, BotConfig, TrendTweet, GeneratedPost } from "../types.js";
import { log } from "../logger.js";

export class ContentEngine {
  private client: Anthropic;
  private model: string;
  private botConfig: BotConfig;

  constructor(aiConfig: AIConfig, botConfig: BotConfig) {
    this.client = new Anthropic({ apiKey: aiConfig.apiKey });
    this.model = aiConfig.model;
    this.botConfig = botConfig;
  }

  /**
   * Analyze trending tweets and generate an original post in the bot's language.
   * The AI creates unique content inspired by trends — never copies.
   */
  async generatePost(trendingTweets: TrendTweet[]): Promise<GeneratedPost | null> {
    if (trendingTweets.length === 0) {
      log("No trending tweets to generate from");
      return null;
    }

    // Pick top tweets as inspiration (max 5)
    const inspiration = trendingTweets.slice(0, 5);
    const tweetSummaries = inspiration.map((t, i) =>
      `${i + 1}. [${t.lang}] @${t.authorUsername} (${t.likeCount} likes): "${t.text}"`
    ).join("\n");

    const langNames: Record<string, string> = {
      es: "Spanish", en: "English", pt: "Portuguese", fr: "French",
      de: "German", it: "Italian", ja: "Japanese", ko: "Korean",
      zh: "Chinese", ar: "Arabic", ru: "Russian",
    };
    const targetLang = langNames[this.botConfig.language] ?? this.botConfig.language;

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: `You are a social media content creator specialized in "${this.botConfig.niche}".

Here are trending tweets about this topic from various languages:
${tweetSummaries}

Create ONE original tweet in ${targetLang} that:
- Is inspired by these trends but is 100% original (never copy/translate directly)
- Captures the most interesting angle or insight
- Is engaging, concise, and natural (not robotic or overly promotional)
- Uses 1-3 relevant hashtags max
- Stays under 280 characters
- Matches the tone of a real person passionate about ${this.botConfig.niche}

Reply with ONLY the tweet text, nothing else.`,
        },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text.trim() : "";

    if (!text || text.length > 280) {
      log(`Generated text invalid (length: ${text.length}), skipping`);
      return null;
    }

    // Pick the best image from the most engaging source tweet that has media
    const sourceWithMedia = inspiration.find((t) => t.mediaUrls.length > 0);
    const bestSource = sourceWithMedia ?? inspiration[0];

    log(`Generated post (${text.length} chars): "${text.slice(0, 80)}..."`);

    return {
      text,
      imageUrl: sourceWithMedia?.mediaUrls[0],
      sourceTweet: bestSource,
    };
  }

  /**
   * Check if content is safe and on-topic before posting.
   */
  async moderateContent(text: string): Promise<{ safe: boolean; reason?: string }> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 100,
      messages: [
        {
          role: "user",
          content: `You are a content moderator. Check if this tweet is safe to post and stays on topic for "${this.botConfig.niche}".

Tweet: "${text}"

Reply with JSON only: {"safe": true} or {"safe": false, "reason": "why"}`,
        },
      ],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text.trim() : "";
    try {
      return JSON.parse(raw) as { safe: boolean; reason?: string };
    } catch {
      // If parsing fails, assume safe
      return { safe: true };
    }
  }
}
