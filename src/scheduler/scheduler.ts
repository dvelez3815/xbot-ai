import type { BotConfig } from "../types.js";
import { log } from "../logger.js";

/**
 * Human-like scheduler.
 * - Randomized intervals between posts
 * - Higher activity during peak hours
 * - Jitter to avoid mechanical patterns
 */
export class Scheduler {
  private config: BotConfig;
  private running = false;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(config: BotConfig) {
    this.config = config;
  }

  /**
   * Calculate the next delay in milliseconds.
   * Shorter delays during peak hours, longer during off-peak.
   */
  getNextDelay(): number {
    const hour = new Date().getHours();
    const isPeak = this.config.peakHours.includes(hour);

    let minMs = this.config.minIntervalMinutes * 60_000;
    let maxMs = this.config.maxIntervalMinutes * 60_000;

    if (isPeak) {
      // During peak hours: tighter intervals (60-80% of normal)
      minMs = Math.floor(minMs * 0.6);
      maxMs = Math.floor(maxMs * 0.8);
    } else {
      // Off-peak: stretch intervals (120-200% of normal)
      minMs = Math.floor(minMs * 1.2);
      maxMs = Math.floor(maxMs * 2.0);
    }

    // Random jitter within the range
    const delay = minMs + Math.floor(Math.random() * (maxMs - minMs));

    // Additional human-like jitter: +/- 15% random noise
    const jitter = delay * 0.15;
    const finalDelay = delay + Math.floor((Math.random() - 0.5) * 2 * jitter);

    return Math.max(finalDelay, 60_000); // Never less than 1 minute
  }

  /**
   * Start the scheduling loop. Calls the provided function at human-like intervals.
   */
  start(onTick: () => Promise<void>): void {
    this.running = true;
    log("Scheduler started");

    const scheduleNext = () => {
      if (!this.running) return;

      const delay = this.getNextDelay();
      const minutes = Math.round(delay / 60_000);
      const nextTime = new Date(Date.now() + delay).toLocaleTimeString();

      log(`Next post in ~${minutes} min (at ${nextTime})`);

      this.timer = setTimeout(async () => {
        if (!this.running) return;

        try {
          await onTick();
        } catch (err) {
          log(`Scheduler tick error: ${err instanceof Error ? err.message : err}`);
        }

        scheduleNext();
      }, delay);
    };

    // Run first cycle immediately, then schedule
    onTick()
      .catch((err) => log(`Initial tick error: ${err instanceof Error ? err.message : err}`))
      .then(() => scheduleNext());
  }

  stop(): void {
    this.running = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    log("Scheduler stopped");
  }
}
