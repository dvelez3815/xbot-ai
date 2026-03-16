import { readFileSync, writeFileSync, renameSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { TrendTweet } from "../types.js";
import { log, debug } from "../logger.js";

interface HistoryEntry {
  tweetIds: string[];
  imageUrls: string[];
  timestamp: number;
}

interface HistoryData {
  entries: HistoryEntry[];
}

export class PostHistory {
  private filePath: string;
  private ttlMs: number;
  private data: HistoryData;

  constructor(filePath: string, ttlDays = 7) {
    this.filePath = filePath;
    this.ttlMs = ttlDays * 24 * 60 * 60 * 1000;
    mkdirSync(dirname(this.filePath), { recursive: true });
    this.data = this.load();
    this.prune();
  }

  private load(): HistoryData {
    try {
      return JSON.parse(readFileSync(this.filePath, "utf-8"));
    } catch {
      return { entries: [] };
    }
  }

  private save(): void {
    try {
      const tmp = this.filePath + ".tmp";
      writeFileSync(tmp, JSON.stringify(this.data, null, 2));
      renameSync(tmp, this.filePath);
    } catch (err) {
      log(`History save error: ${err instanceof Error ? err.message : err}`);
    }
  }

  private prune(): void {
    const cutoff = Date.now() - this.ttlMs;
    const before = this.data.entries.length;
    this.data.entries = this.data.entries.filter(e => e.timestamp > cutoff);
    if (this.data.entries.length !== before) {
      debug("history:prune", { removed: before - this.data.entries.length });
      this.save();
    }
  }

  record(tweetIds: string[], imageUrls: string[]): void {
    this.data.entries.push({ tweetIds, imageUrls, timestamp: Date.now() });
    this.prune();
    this.save();
  }

  getUsedTweetIds(): Set<string> {
    const ids = new Set<string>();
    for (const e of this.data.entries) for (const id of e.tweetIds) ids.add(id);
    return ids;
  }

  getUsedImageUrls(): Set<string> {
    const urls = new Set<string>();
    for (const e of this.data.entries) for (const url of e.imageUrls) urls.add(url);
    return urls;
  }

  filterTrending(tweets: TrendTweet[]): TrendTweet[] {
    const used = this.getUsedTweetIds();
    return tweets.filter(t => !used.has(t.id));
  }
}
