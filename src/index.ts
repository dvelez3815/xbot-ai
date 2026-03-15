#!/usr/bin/env node

import { loadConfig } from "./config.js";
import { Engine } from "./core/engine.js";
import { Scheduler } from "./scheduler/scheduler.js";
import { EnvKeys } from "./constants.js";
import { log, debug } from "./logger.js";

function printBanner(config: import("./types.js").AppConfig): void {
  console.log(`
  ╔══════════════════════════════════════╗
  ║          xbot-ai v0.1.0             ║
  ║   AI-Powered X/Twitter Automation   ║
  ╚══════════════════════════════════════╝
  `);
  log(`Niche: "${config.bot.niche}"`);
  log(`Post language: ${config.bot.language}`);
  log(`Search languages: ${config.bot.searchLanguages.join(", ")}`);
  log(`Variants: ${config.bot.postVariants.join(", ")}`);
  log(`Posts per day: ${config.bot.postsPerDay} (${config.bot.postVariants.length} per cycle)`);
  if (process.env[EnvKeys.DEBUG] === "true" || process.env[EnvKeys.DEBUG] === "1") {
    log("DEBUG mode: ON");
  }
  console.log();
}

async function main(): Promise<void> {
  const config = loadConfig();

  printBanner(config);

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
    const cycle = await engine.cycle();
    if (cycle.totalPosted > 0) {
      log(`Cycle summary: ${cycle.totalPosted} posted, ${cycle.totalFailed} failed`);
    } else if (cycle.results.length > 0) {
      log(`Cycle completed without posting: ${cycle.results.map((r) => r.error).join(", ")}`);
    }
  });
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
