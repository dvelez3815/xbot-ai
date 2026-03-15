import type { XClient } from "../x/client.js";
import type { BotConfig, TrendTweet } from "../types.js";
import { log, debug } from "../logger.js";

/**
 * Searches for trending content across multiple languages for the configured niche.
 * Returns the most engaging tweets found.
 */
export async function findTrendingContent(
  xClient: XClient,
  config: BotConfig,
): Promise<TrendTweet[]> {
  const allTweets: TrendTweet[] = [];

  for (const lang of config.searchLanguages) {
    log(`Searching trends for "${config.niche}" in [${lang}]...`);
    try {
      const tweets = await xClient.searchTrending(config.niche, lang, 15);
      log(`  Found ${tweets.length} tweets in [${lang}]`);
      debug(`trends:${lang}`, tweets.map((t) => ({
        id: t.id,
        author: `@${t.authorUsername}`,
        likes: t.likeCount,
        retweets: t.retweetCount,
        hasMedia: t.mediaUrls.length > 0,
        text: t.text.slice(0, 100),
      })));
    allTweets.push(...tweets);
    } catch (err) {
      log(`  Error searching [${lang}]: ${err instanceof Error ? err.message : err}`);
    }
  }

  // Deduplicate by tweet ID and sort by total engagement
  const seen = new Set<string>();
  const unique = allTweets.filter((t) => {
    if (seen.has(t.id)) return false;
    seen.add(t.id);
    return true;
  });

  unique.sort((a, b) => (b.likeCount + b.retweetCount) - (a.likeCount + a.retweetCount));

  log(`Total unique trending tweets found: ${unique.length}`);
  debug("trends:top5", unique.slice(0, 5).map((t) => `@${t.authorUsername} (${t.likeCount}+${t.retweetCount}): ${t.text.slice(0, 80)}`));

  return unique;
}
