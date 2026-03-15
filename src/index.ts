#!/usr/bin/env node

import { loadConfig } from "./config.js";
import { Engine } from "./core/engine.js";
import { Scheduler } from "./scheduler/scheduler.js";
import { EnvKeys } from "./constants.js";
import { log, debug } from "./logger.js";

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
  if (process.env[EnvKeys.DEBUG] === "true" || process.env[EnvKeys.DEBUG] === "1") {
    log("DEBUG mode: ON");
  }
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

  debug("config:loaded", {
    aiProvider: config.ai.provider,
    aiModel: config.ai.model,
    aiBaseUrl: config.ai.baseUrl,
    xBearerToken: `${config.x.bearerToken.slice(0, 10)}...`,
    xApiKey: `${config.x.apiKey.slice(0, 6)}...`,
  });

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
