#!/usr/bin/env node

import { loadConfig } from "./config.js";
import { Engine } from "./core/engine.js";
import { Scheduler } from "./scheduler/scheduler.js";
import { log } from "./logger.js";

function printBanner(niche: string, lang: string, searchLangs: string[], postsPerDay: number): void {
  console.log(`
  ╔══════════════════════════════════════╗
  ║          xbot-ai v0.1.0             ║
  ║   AI-Powered X/Twitter Automation   ║
  ╚══════════════════════════════════════╝
  `);
  log(`Niche: "${niche}"`);
  log(`Post language: ${lang}`);
  log(`Search languages: ${searchLangs.join(", ")}`);
  log(`Posts per day: ${postsPerDay}`);
  console.log();
}

async function main(): Promise<void> {
  const config = loadConfig();

  printBanner(
    config.bot.niche,
    config.bot.language,
    config.bot.searchLanguages,
    config.bot.postsPerDay,
  );

  const engine = new Engine(config);
  const scheduler = new Scheduler(config.bot);

  // Graceful shutdown
  const shutdown = () => {
    log("Shutting down...");
    scheduler.stop();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  // Start the bot
  log("Starting bot...");
  scheduler.start(async () => {
    const result = await engine.cycle();
    if (result.success) {
      log(`Successfully posted tweet: ${result.tweetId}`);
    } else {
      log(`Cycle completed without posting: ${result.error}`);
    }
  });
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
