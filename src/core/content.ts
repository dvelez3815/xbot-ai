import type { AIConfig, BotConfig, TrendTweet, GeneratedPost } from "../types.js";
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
   * Analyze trending tweets and generate an original post in the bot's language.
   */
  async generatePost(trendingTweets: TrendTweet[]): Promise<GeneratedPost | null> {
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

    log("Generating post with AI...");
    const text = await this.chat([
      {
        role: "system",
        content: `You are a sharp, opinionated social media creator specialized in "${this.botConfig.niche}". You write in ${targetLang}. You sound like a real person who actually uses these tools daily — not a marketer. You ALWAYS mention specific tools, features, or techniques by name. You never write vague or generic content. You love sparking debate and getting people to reply with their own experiences.`,
      },
      {
        role: "user",
        content: `Here are trending tweets about "${this.botConfig.niche}" from various languages:
${tweetSummaries}

Create ONE original post in ${targetLang}. Rules:
- BE SPECIFIC: mention real tool names, features, or techniques from the trends above
- If the trends mention tools (ChatGPT, Claude, Fireflies, etc.), reference them by name
- Add your own take: a tip, a comparison, an opinion, or a "here's what most people miss"
- SPARK DEBATE: include a mildly controversial opinion, a hot take, or a comparison that makes people want to reply
  Examples of good debate starters:
  - "Everyone recommends X but honestly Y does it better because..."
  - "Unpopular opinion: the free version of X beats the paid Z for..."
  - "I switched from X to Y last week. Here's what surprised me..."
  - "People sleep on X while paying for Y. Makes no sense."
- End with a question or challenge that invites people to share their experience (not just "what do you think?" — be specific: "Has anyone tried X for [specific task]?" or "Convince me I'm wrong")
- Sound like someone who genuinely uses these tools, not a bot listing features
- 1-3 relevant hashtags max
- MUST be under ${this.botConfig.postMaxLength} characters (HARD limit)
- If the image from the source tweet shows a list or infographic, reference specific items from it

Reply with ONLY the post text, nothing else.`,
      },
    ], "generate");

    let finalText = text;

    // If slightly over limit, ask AI to shorten it
    const shortenThreshold = Math.floor(this.botConfig.postMaxLength * 1.4);
    if (finalText && finalText.length > this.botConfig.postMaxLength && finalText.length <= shortenThreshold) {
      log(`Post too long (${finalText.length} chars), asking AI to shorten...`);
      const shortened = await this.chat([
        {
          role: "system",
          content: "You shorten tweets. Keep the same meaning and tone. Reply with ONLY the shortened tweet.",
        },
        {
          role: "user",
          content: `This tweet is ${finalText.length} characters but must be under ${this.botConfig.postMaxLength}. Shorten it without losing the core message. Remove line breaks. Keep hashtags.\n\nTweet: "${finalText}"`,
        },
      ], "shorten");

      debug("shorten:result", { original: finalText.length, shortened: shortened.length, text: shortened });
      finalText = shortened;
    }

    if (!finalText || finalText.length > this.botConfig.postMaxLength) {
      log(`Generated text invalid (length: ${finalText?.length ?? 0}), skipping`);
      debug("generate:rejected", { length: finalText?.length ?? 0, text: finalText });
      return null;
    }

    // Ask AI to pick the most relevant image for the generated post
    const tweetsWithMedia = inspiration.filter((t) => t.mediaUrls.length > 0);
    let chosenImageUrl: string | undefined;

    if (tweetsWithMedia.length > 0) {
      log("Selecting best image for post...");
      chosenImageUrl = await this.pickRelevantImage(finalText, tweetsWithMedia);
    }

    const bestSource = tweetsWithMedia.find((t) => t.mediaUrls[0] === chosenImageUrl) ?? inspiration[0];

    log(`Generated post (${finalText.length} chars): "${finalText.slice(0, 80)}..."`);
    debug("generate:final", { text: finalText, hasImage: Boolean(chosenImageUrl), imageUrl: chosenImageUrl });

    return {
      text: finalText,
      imageUrl: chosenImageUrl,
      sourceTweet: bestSource,
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
        content: `Here is a tweet that will be posted:
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
        content: `Check if this tweet is safe to post and stays on topic for "${this.botConfig.niche}".

Tweet: "${text}"

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
}
