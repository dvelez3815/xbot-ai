import type { AppConfig, PostResult } from "../types.js";
import { XClient } from "../x/client.js";
import { ContentEngine } from "./content.js";
import { findTrendingContent } from "./trends.js";
import { log, debug } from "../logger.js";

/**
 * The AI heart of the bot.
 * Orchestrates: search trends -> generate content -> moderate -> publish.
 */
export class Engine {
  private xClient: XClient;
  private contentEngine: ContentEngine;
  private config: AppConfig;
  private postsToday = 0;
  private lastPostDate = "";

  constructor(config: AppConfig) {
    this.config = config;
    this.xClient = new XClient(config.x);
    this.contentEngine = new ContentEngine(config.ai, config.bot);
    debug("engine:init", {
      provider: config.ai.provider,
      model: config.ai.model,
      niche: config.bot.niche,
      language: config.bot.language,
      searchLanguages: config.bot.searchLanguages,
    });
  }

  /**
   * Run one cycle: find trends, generate a post, moderate it, and publish.
   */
  async cycle(): Promise<PostResult> {
    const today = new Date().toISOString().split("T")[0];
    if (today !== this.lastPostDate) {
      this.postsToday = 0;
      this.lastPostDate = today;
    }

    if (this.postsToday >= this.config.bot.postsPerDay) {
      log(`Daily limit reached (${this.postsToday}/${this.config.bot.postsPerDay}). Skipping.`);
      return { success: false, error: "daily_limit_reached", postedAt: new Date() };
    }

    try {
      // Step 1: Find trending content
      log("--- Cycle start ---");
      debug("cycle:step", "1/5 Searching trending content...");
      const trending = await findTrendingContent(this.xClient, this.config.bot);

      if (trending.length === 0) {
        log("No trending content found. Skipping cycle.");
        return { success: false, error: "no_trends_found", postedAt: new Date() };
      }

      // Step 2: Generate a post (retry once on failure)
      debug("cycle:step", "2/5 Generating post with AI...");
      let post = await this.contentEngine.generatePost(trending);
      if (!post) {
        log("Generation failed, retrying once...");
        debug("cycle:step", "2/5 Retrying generation...");
        post = await this.contentEngine.generatePost(trending);
      }
      if (!post) {
        return { success: false, error: "generation_failed", postedAt: new Date() };
      }

      // Step 3: Moderate content
      debug("cycle:step", "3/5 Moderating content...");
      const moderation = await this.contentEngine.moderateContent(post.text);
      if (!moderation.safe) {
        log(`Post rejected by moderation: ${moderation.reason}`);
        return { success: false, error: `moderation: ${moderation.reason}`, postedAt: new Date() };
      }

      // Step 4: Download image if available
      let imageBuffer: Buffer | undefined;
      if (post.imageUrl) {
        debug("cycle:step", "4/5 Downloading image...");
        try {
          log(`Downloading image: ${post.imageUrl}`);
          imageBuffer = await this.xClient.downloadImage(post.imageUrl);
          debug("cycle:image", { size: `${(imageBuffer.length / 1024).toFixed(1)} KB` });
        } catch (err) {
          log(`Image download failed, posting without image: ${err instanceof Error ? err.message : err}`);
        }
      } else {
        debug("cycle:step", "4/5 No image available, skipping download");
      }

      // Step 5: Publish
      debug("cycle:step", "5/5 Publishing tweet...");
      log(`Publishing: "${post.text.slice(0, 80)}..."`);
      const result = await this.xClient.publishTweet(post.text, imageBuffer);

      this.postsToday++;
      log(`Posted! Tweet ID: ${result.id} (${this.postsToday}/${this.config.bot.postsPerDay} today)`);

      return {
        success: true,
        tweetId: result.id,
        postedAt: new Date(),
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      log(`Cycle error: ${message}`);
      debug("cycle:error", { message, stack: err instanceof Error ? err.stack : undefined });
      return { success: false, error: message, postedAt: new Date() };
    }
  }
}
