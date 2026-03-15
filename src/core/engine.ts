import type { AppConfig, PostResult, GeneratedPost } from "../types.js";
import { XClient } from "../x/client.js";
import { ContentEngine } from "./content.js";
import { findTrendingContent } from "./trends.js";
import { getVariants, type PostVariant } from "./variants/index.js";
import { log, debug } from "../logger.js";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface CycleResult {
  results: PostResult[];
  totalPosted: number;
  totalFailed: number;
}

/**
 * The AI heart of the bot.
 * Each cycle generates one post per active variant.
 */
export class Engine {
  private xClient: XClient;
  private contentEngine: ContentEngine;
  private config: AppConfig;
  private variants: PostVariant[];
  private postsToday = 0;
  private lastPostDate = "";

  constructor(config: AppConfig) {
    this.config = config;
    this.xClient = new XClient(config.x);
    this.contentEngine = new ContentEngine(config.ai, config.bot);
    this.variants = getVariants(config.bot.postVariants);

    debug("engine:init", {
      provider: config.ai.provider,
      model: config.ai.model,
      niche: config.bot.niche,
      language: config.bot.language,
      searchLanguages: config.bot.searchLanguages,
      variants: this.variants.map((v) => v.id),
      postsPerCycle: this.variants.length,
      postsPerDay: config.bot.postsPerDay,
    });
  }

  /**
   * Run one cycle: find trends, then generate + publish one post per variant.
   */
  async cycle(): Promise<CycleResult> {
    const today = new Date().toISOString().split("T")[0];
    if (today !== this.lastPostDate) {
      this.postsToday = 0;
      this.lastPostDate = today;
    }

    if (this.postsToday >= this.config.bot.postsPerDay) {
      log(`Daily limit reached (${this.postsToday}/${this.config.bot.postsPerDay}). Skipping.`);
      return { results: [], totalPosted: 0, totalFailed: 0 };
    }

    log(`--- Cycle start (${this.variants.length} variants) ---`);

    // Step 1: Find trending content (shared across all variants)
    debug("cycle:step", "1. Searching trending content...");
    const trending = await findTrendingContent(this.xClient, this.config.bot);

    if (trending.length === 0) {
      log("No trending content found. Skipping cycle.");
      return { results: [{ success: false, error: "no_trends_found", postedAt: new Date() }], totalPosted: 0, totalFailed: 1 };
    }

    // Step 2: Generate + publish one post per variant
    const results: PostResult[] = [];
    let totalPosted = 0;
    let totalFailed = 0;

    for (let i = 0; i < this.variants.length; i++) {
      if (this.postsToday >= this.config.bot.postsPerDay) {
        log(`Daily limit reached mid-cycle. Stopping.`);
        break;
      }

      const variant = this.variants[i];
      log(`--- Variant ${i + 1}/${this.variants.length}: [${variant.name}] ---`);

      const result = await this.processVariant(variant, trending);
      results.push(result);

      if (result.success) {
        totalPosted++;
      } else {
        totalFailed++;
      }

      // Delay between posts in the same cycle (skip after last)
      if (i < this.variants.length - 1 && result.success) {
        const delay = this.config.bot.delayBetweenPostsSeconds;
        log(`Waiting ${delay}s before next variant...`);
        await sleep(delay * 1000);
      }
    }

    // Step 3: Reply to viral tweets (if enabled)
    let totalReplies = 0;
    if (this.config.bot.replyEnabled) {
      totalReplies = await this.processReplies(trending);
    }

    log(`--- Cycle done: ${totalPosted} posted, ${totalReplies} replies, ${totalFailed} failed (${this.postsToday}/${this.config.bot.postsPerDay} today) ---`);
    return { results, totalPosted, totalFailed };
  }

  /**
   * Randomly reply to trending tweets based on configured chance.
   */
  private async processReplies(trending: import("../types.js").TrendTweet[]): Promise<number> {
    const chance = this.config.bot.replyChancePercent / 100;
    let repliesSent = 0;

    for (const tweet of trending) {
      // Only reply to tweets in the bot's language to avoid cross-language replies
      if (tweet.lang !== this.config.bot.language) continue;
      if (Math.random() > chance) continue;

      try {
        log(`--- Reply to viral tweet (${tweet.likeCount} likes) ---`);
        debug("reply:target", { id: tweet.id, likes: tweet.likeCount, text: tweet.text.slice(0, 100) });

        const replyText = await this.contentEngine.generateReply(tweet);
        if (!replyText) continue;

        // Moderate the reply
        const moderation = await this.contentEngine.moderateContent(replyText);
        if (!moderation.safe) {
          log(`Reply rejected by moderation: ${moderation.reason}`);
          continue;
        }

        log(`Replying: "${replyText.slice(0, 80)}..."`);
        const result = await this.xClient.replyToTweet(replyText, tweet.id);
        repliesSent++;

        log(`Replied! Tweet ID: ${result.id}`);
        debug("reply:posted", { tweetId: result.id, inReplyTo: tweet.id, variant: "reply" });

        // Small delay between replies
        if (repliesSent > 0) {
          const delay = Math.floor(30 + Math.random() * 60);
          log(`Waiting ${delay}s before next reply...`);
          await sleep(delay * 1000);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        log(`Reply error: ${message}`);
        debug("reply:error", { tweetId: tweet.id, message });
      }
    }

    if (repliesSent > 0) {
      log(`Sent ${repliesSent} replies to viral tweets`);
    }

    return repliesSent;
  }

  /**
   * Generate, moderate, and publish a single post for one variant.
   */
  private async processVariant(variant: PostVariant, trending: import("../types.js").TrendTweet[]): Promise<PostResult> {
    try {
      // Generate (with retry)
      let post: GeneratedPost | null = await this.contentEngine.generatePost(trending, variant);
      if (!post) {
        log(`[${variant.name}] Generation failed, retrying...`);
        post = await this.contentEngine.generatePost(trending, variant);
      }
      if (!post) {
        return { success: false, error: "generation_failed", postedAt: new Date() };
      }

      // Moderate
      const moderation = await this.contentEngine.moderateContent(post.text);
      if (!moderation.safe) {
        log(`[${variant.name}] Rejected by moderation: ${moderation.reason}`);
        return { success: false, error: `moderation: ${moderation.reason}`, postedAt: new Date() };
      }

      // Download image
      let imageBuffer: Buffer | undefined;
      if (post.imageUrl) {
        try {
          log(`Downloading image: ${post.imageUrl}`);
          imageBuffer = await this.xClient.downloadImage(post.imageUrl);
          debug("cycle:image", { size: `${(imageBuffer.length / 1024).toFixed(1)} KB` });
        } catch (err) {
          log(`Image download failed, posting without image: ${err instanceof Error ? err.message : err}`);
        }
      }

      // Publish
      log(`Publishing [${variant.name}]: "${post.text.slice(0, 80)}..."`);
      const result = await this.xClient.publishTweet(post.text, imageBuffer);

      this.postsToday++;
      log(`Posted [${variant.name}]! Tweet ID: ${result.id} (${this.postsToday}/${this.config.bot.postsPerDay} today)`);

      return { success: true, tweetId: result.id, postedAt: new Date() };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      log(`[${variant.name}] Error: ${message}`);
      debug("cycle:error", { variant: variant.id, message, stack: err instanceof Error ? err.stack : undefined });
      return { success: false, error: message, postedAt: new Date() };
    }
  }
}
