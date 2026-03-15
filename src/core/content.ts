import type { AIConfig, BotConfig, TrendTweet, GeneratedPost } from "../types.js";
import { log, debug } from "../logger.js";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

/**
 * Strip thinking model artifacts from the response.
 * Models like Qwen 3.5 emit the answer followed by reasoning tokens.
 */
function cleanModelOutput(raw: string): string {
  // Cut at common end-of-generation / thinking tokens
  const stopPatterns = [
    "<|endoftext|>",
    "<|im_end|>",
    "<|im_start|>",
    "</think>",
    "<think>",
    "</s>",
    "<|eot_id|>",
  ];

  let cleaned = raw;
  for (const pattern of stopPatterns) {
    const idx = cleaned.indexOf(pattern);
    if (idx !== -1) {
      cleaned = cleaned.slice(0, idx);
    }
  }

  return cleaned.trim();
}

/**
 * Calls Ollama's native chat API or Anthropic's API depending on config.
 */
async function chatCompletion(config: AIConfig, messages: ChatMessage[], tag: string): Promise<string> {
  if (config.provider === "ollama") {
    const payload = {
      model: config.model,
      messages,
      stream: false,
    };

    debug(`${tag}:request`, {
      url: `${config.baseUrl}/api/chat`,
      model: config.model,
      messageCount: messages.length,
    });
    debug(`${tag}:prompt`, messages.map((m) => `[${m.role}] ${m.content}`).join("\n\n"));

    const timeoutMs = config.timeoutSeconds * 1000;
    const start = Date.now();
    const response = await fetch(`${config.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!response.ok) {
      const body = await response.text();
      debug(`${tag}:error`, { status: response.status, body });
      throw new Error(`Ollama error: ${response.status} ${body}`);
    }

    const data = (await response.json()) as {
      message: { content: string };
      total_duration?: number;
      eval_count?: number;
    };
    const elapsed = Date.now() - start;
    const rawResult = data.message.content.trim();
    const result = cleanModelOutput(rawResult);

    if (rawResult.length !== result.length) {
      debug(`${tag}:cleaned`, `${rawResult.length} chars -> ${result.length} chars (stripped ${rawResult.length - result.length} chars of thinking tokens)`);
    }
    debug(`${tag}:response`, result);
    debug(`${tag}:stats`, {
      elapsed: `${elapsed}ms`,
      tokens: data.eval_count ?? "unknown",
      tokensPerSec: data.eval_count ? `${(data.eval_count / (elapsed / 1000)).toFixed(1)} t/s` : "unknown",
    });

    return result;
  }

  // Anthropic fallback
  debug(`${tag}:request`, { provider: "anthropic", model: config.model });
  debug(`${tag}:prompt`, messages.map((m) => `[${m.role}] ${m.content}`).join("\n\n"));

  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey: config.apiKey });

  const start = Date.now();
  const response = await client.messages.create({
    model: config.model,
    max_tokens: 300,
    messages: messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    system: messages.find((m) => m.role === "system")?.content,
  });

  const result = response.content[0].type === "text" ? response.content[0].text.trim() : "";
  const elapsed = Date.now() - start;

  debug(`${tag}:response`, result);
  debug(`${tag}:stats`, { elapsed: `${elapsed}ms`, inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens });

  return result;
}

export class ContentEngine {
  private aiConfig: AIConfig;
  private botConfig: BotConfig;

  constructor(aiConfig: AIConfig, botConfig: BotConfig) {
    this.aiConfig = aiConfig;
    this.botConfig = botConfig;
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

    const langNames: Record<string, string> = {
      es: "Spanish", en: "English", pt: "Portuguese", fr: "French",
      de: "German", it: "Italian", ja: "Japanese", ko: "Korean",
      zh: "Chinese", ar: "Arabic", ru: "Russian",
    };
    const targetLang = langNames[this.botConfig.language] ?? this.botConfig.language;

    log("Generating post with AI...");
    const text = await chatCompletion(this.aiConfig, [
      {
        role: "system",
        content: `You are a social media content creator specialized in "${this.botConfig.niche}". You write in ${targetLang}. You are creative, concise, and sound like a real person.`,
      },
      {
        role: "user",
        content: `Here are trending tweets about "${this.botConfig.niche}" from various languages:
${tweetSummaries}

Create ONE original tweet in ${targetLang} that:
- Is inspired by these trends but is 100% original (never copy/translate directly)
- Captures the most interesting angle or insight
- Is engaging, concise, and natural (not robotic or overly promotional)
- Uses 1-3 relevant hashtags max
- MUST be under 280 characters (this is a HARD limit, count carefully)
- Write it as a single short paragraph, avoid line breaks
- Matches the tone of a real person passionate about ${this.botConfig.niche}

Reply with ONLY the tweet text, nothing else. No line breaks, no formatting.`,
      },
    ], "generate");

    let finalText = text;

    // If slightly over limit, ask AI to shorten it
    if (finalText && finalText.length > 280 && finalText.length <= 400) {
      log(`Post too long (${finalText.length} chars), asking AI to shorten...`);
      const shortened = await chatCompletion(this.aiConfig, [
        {
          role: "system",
          content: "You shorten tweets. Keep the same meaning and tone. Reply with ONLY the shortened tweet.",
        },
        {
          role: "user",
          content: `This tweet is ${finalText.length} characters but must be under 280. Shorten it without losing the core message. Remove line breaks. Keep hashtags.\n\nTweet: "${finalText}"`,
        },
      ], "shorten");

      debug("shorten:result", { original: finalText.length, shortened: shortened.length, text: shortened });
      finalText = shortened;
    }

    if (!finalText || finalText.length > 280) {
      log(`Generated text invalid (length: ${finalText?.length ?? 0}), skipping`);
      debug("generate:rejected", { length: finalText?.length ?? 0, text: finalText });
      return null;
    }

    // Ask AI to pick the most relevant image for the generated post
    const tweetsWithMedia = inspiration.filter((t) => t.mediaUrls.length > 0);
    let chosenImageUrl: string | undefined;

    if (tweetsWithMedia.length > 0) {
      log("Selecting best image for post...");
      chosenImageUrl = await this.pickRelevantImage(text, tweetsWithMedia);
    }

    const bestSource = tweetsWithMedia.find((t) => t.mediaUrls[0] === chosenImageUrl) ?? inspiration[0];

    log(`Generated post (${text.length} chars): "${text.slice(0, 80)}..."`);
    debug("generate:final", { text, hasImage: Boolean(chosenImageUrl), imageUrl: chosenImageUrl });

    return {
      text,
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

    const raw = await chatCompletion(this.aiConfig, [
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

    const raw = await chatCompletion(this.aiConfig, [
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
