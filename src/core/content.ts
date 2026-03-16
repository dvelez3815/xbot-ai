import type { AIConfig, BotConfig, TrendTweet, GeneratedPost } from "../types.js";
import type { PostVariant } from "./variants/index.js";
import { createProvider, type AIProvider, type ChatMessage } from "../providers/index.js";
import { LANGUAGE_NAMES } from "../constants.js";
import { log, debug } from "../logger.js";

export class ContentEngine {
  private provider: AIProvider;
  private botConfig: BotConfig;

  constructor(aiConfig: AIConfig, botConfig: BotConfig) {
    this.provider = createProvider(aiConfig);
    this.botConfig = botConfig;
  }

  private async chat(messages: ChatMessage[], tag: string): Promise<string> {
    const result = await this.provider.chatCompletion(messages, tag);
    return result.text;
  }

  /**
   * Generate a post using a specific variant's prompts.
   */
  async generatePost(trendingTweets: TrendTweet[], variant: PostVariant, usedImageUrls?: Set<string>): Promise<GeneratedPost | null> {
    if (trendingTweets.length === 0) {
      log("No trending tweets to generate from");
      return null;
    }

    const inspiration = trendingTweets.slice(0, 5);
    const tweetSummaries = inspiration.map((t, i) =>
      `${i + 1}. [${t.lang}] @${t.authorUsername} (${t.likeCount} likes): "${t.text}"`
    ).join("\n");

    debug("generate:inspiration", tweetSummaries);

    const targetLang = LANGUAGE_NAMES[this.botConfig.language] ?? this.botConfig.language;
    const maxLength = variant.maxLength;

    log(`Generating [${variant.name}] post (${variant.minLength}-${maxLength} chars)...`);
    const tag = `generate:${variant.id}`;

    const text = await this.chat([
      { role: "system", content: variant.systemPrompt(this.botConfig.niche, targetLang) },
      { role: "user", content: variant.userPrompt(this.botConfig.niche, targetLang, maxLength, tweetSummaries) },
    ], tag);

    let finalText = text;

    // If slightly over limit, ask AI to shorten
    const shortenThreshold = Math.floor(maxLength * 1.4);
    if (finalText && finalText.length > maxLength && finalText.length <= shortenThreshold) {
      log(`Post too long (${finalText.length}/${maxLength} chars), asking AI to shorten...`);
      const shortened = await this.chat([
        {
          role: "system",
          content: "You shorten social media posts. Keep the same meaning, tone, and specificity. Use PLAIN TEXT only — no markdown formatting like **bold** or *italics*. Reply with ONLY the shortened post.",
        },
        {
          role: "user",
          content: `This post is ${finalText.length} characters but must be under ${maxLength}. Shorten it without losing specific tool names or the core message. Keep hashtags and line breaks.\n\nPost: "${finalText}"`,
        },
      ], `shorten:${variant.id}`);

      debug("shorten:result", { original: finalText.length, shortened: shortened.length, text: shortened });
      finalText = shortened;
    }

    if (!finalText || finalText.length > maxLength || finalText.length < variant.minLength) {
      log(`Generated text invalid (length: ${finalText?.length ?? 0}, required: ${variant.minLength}-${maxLength}), skipping`);
      debug("generate:rejected", { variant: variant.id, length: finalText?.length ?? 0, min: variant.minLength, max: maxLength, text: finalText });
      return null;
    }

    // Ask AI to pick the most relevant image
    const tweetsWithMedia = inspiration.filter((t) => {
      if (t.mediaUrls.length === 0) return false;
      if (usedImageUrls && usedImageUrls.has(t.mediaUrls[0])) return false;
      return true;
    });
    let chosenImageUrl: string | undefined;

    if (tweetsWithMedia.length > 0) {
      log("Selecting best image for post...");
      chosenImageUrl = await this.pickRelevantImage(finalText, tweetsWithMedia);
    }

    const bestSource = tweetsWithMedia.find((t) => t.mediaUrls[0] === chosenImageUrl) ?? inspiration[0];

    log(`[${variant.name}] post (${finalText.length} chars): "${finalText.slice(0, 80)}..."`);
    debug("generate:final", { variant: variant.id, text: finalText, hasImage: Boolean(chosenImageUrl), imageUrl: chosenImageUrl });

    return {
      text: finalText,
      imageUrl: chosenImageUrl,
      sourceTweet: bestSource,
      variantId: variant.id,
    };
  }

  /**
   * Ask AI to pick the most relevant image from source tweets, or none.
   */
  private async pickRelevantImage(postText: string, tweetsWithMedia: TrendTweet[]): Promise<string | undefined> {
    const options = tweetsWithMedia.map((t, i) =>
      `${i + 1}. Tweet: "${t.text.slice(0, 120)}..." | Image URL: ${t.mediaUrls[0]}`
    ).join("\n");

    const raw = await this.chat([
      {
        role: "system",
        content: "You select the most relevant image for a social media post. Reply only with valid JSON.",
      },
      {
        role: "user",
        content: `Here is a post that will be published:
"${postText}"

Here are available images from source tweets:
${options}

Pick the image that best matches the post's topic and tone.
If NONE of the images are relevant to the post, reply: {"pick": 0}
Otherwise reply with the number: {"pick": 1} or {"pick": 2} etc.

Reply with JSON only.`,
      },
    ], "pick-image");

    try {
      const result = JSON.parse(raw) as { pick: number };
      debug("pick-image:result", result);

      if (result.pick === 0 || result.pick > tweetsWithMedia.length) {
        log("AI decided: no relevant image for this post");
        return undefined;
      }

      const chosen = tweetsWithMedia[result.pick - 1];
      log(`AI picked image ${result.pick}: ${chosen.mediaUrls[0]}`);
      return chosen.mediaUrls[0];
    } catch {
      debug("pick-image:parse-error", { raw });
      log("Could not parse image selection, skipping image");
      return undefined;
    }
  }

  /**
   * Check if content is safe and on-topic before posting.
   */
  async moderateContent(text: string): Promise<{ safe: boolean; reason?: string }> {
    log("Moderating content...");

    const raw = await this.chat([
      {
        role: "system",
        content: "You are a content moderator. Reply only with valid JSON.",
      },
      {
        role: "user",
        content: `Check if this post is safe to publish and stays on topic for "${this.botConfig.niche}".

Post: "${text}"

Reply with JSON only: {"safe": true} or {"safe": false, "reason": "why"}`,
      },
    ], "moderate");

    try {
      const result = JSON.parse(raw) as { safe: boolean; reason?: string };
      debug("moderate:result", result);
      return result;
    } catch {
      debug("moderate:parse-error", { raw });
      return { safe: true };
    }
  }

  /**
   * Generate a deep, insightful reply to a viral tweet.
   */
  async generateReply(tweet: import("../types.js").TrendTweet): Promise<string | null> {
    const targetLang = LANGUAGE_NAMES[this.botConfig.language] ?? this.botConfig.language;

    log(`Generating reply to tweet ${tweet.id} (${tweet.likeCount} likes)...`);

    const text = await this.chat([
      {
        role: "system",
        content: `You are a senior practitioner and analyst of "${this.botConfig.niche}" with years of hands-on experience. You write replies in ${targetLang} that make people stop and think. You challenge surface-level takes with nuance and explain the WHY behind things. You never write generic comments.`,
      },
      {
        role: "user",
        content: `Here is a viral tweet about "${this.botConfig.niche}":
"${tweet.text}"

Analyze this tweet deeply and write a reply in ${targetLang} that:
- DEEP ANALYSIS: break down what the author is saying, explain WHY it matters or WHY it's wrong
- SPECIFIC: reference specific claims, tools, or ideas from the tweet — show you actually read it
- EXPERIENCE: write as someone with hands-on experience, share a concrete workflow, result, or lesson learned
- COUNTERPOINT OR EXPANSION: either challenge an assumption or add a layer the author missed
- Under ${this.botConfig.postMaxLength} characters
- No hashtags (replies with hashtags look spammy)
- Do NOT start with "Great point", "Interesting", "Love this", or "So true" — jump straight into the insight
- Write in PLAIN TEXT only. No markdown formatting (**bold**, *italics*, # headers) — these symbols appear as literal characters on social media

Reply with ONLY the reply text, nothing else.`,
      },
    ], "reply");

    if (!text || text.length > this.botConfig.postMaxLength) {
      log(`Reply too long or empty (${text?.length ?? 0} chars), skipping`);
      return null;
    }

    debug("reply:generated", { tweetId: tweet.id, length: text.length, text });
    return text;
  }
}
