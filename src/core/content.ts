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
- Stays under 280 characters
- Matches the tone of a real person passionate about ${this.botConfig.niche}

Reply with ONLY the tweet text, nothing else.`,
      },
    ], "generate");

    if (!text || text.length > 280) {
      log(`Generated text invalid (length: ${text.length}), skipping`);
      debug("generate:rejected", { length: text.length, text });
      return null;
    }

    const sourceWithMedia = inspiration.find((t) => t.mediaUrls.length > 0);
    const bestSource = sourceWithMedia ?? inspiration[0];

    log(`Generated post (${text.length} chars): "${text.slice(0, 80)}..."`);
    debug("generate:final", { text, hasImage: Boolean(sourceWithMedia), imageUrl: sourceWithMedia?.mediaUrls[0] });

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
