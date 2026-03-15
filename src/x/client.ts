import { TwitterApi } from "twitter-api-v2";
import type { XCredentials, TrendTweet } from "../types.js";

export class XClient {
  private readClient: TwitterApi;
  private writeClient: TwitterApi;

  constructor(credentials: XCredentials) {
    // Read-only client (app-only, bearer token)
    this.readClient = new TwitterApi(credentials.bearerToken);

    // Read-write client (user context, OAuth 1.0a)
    this.writeClient = new TwitterApi({
      appKey: credentials.apiKey,
      appSecret: credentials.apiSecret,
      accessToken: credentials.accessToken,
      accessSecret: credentials.accessSecret,
    });
  }

  /**
   * Search recent tweets about a topic in a specific language.
   * Sorted by relevance (engagement).
   */
  async searchTrending(query: string, lang: string, maxResults = 20): Promise<TrendTweet[]> {
    const fullQuery = `${query} lang:${lang} -is:retweet -is:reply has:media`;

    const result = await this.readClient.v2.search(fullQuery, {
      max_results: Math.min(maxResults, 100),
      "tweet.fields": ["created_at", "public_metrics", "lang", "attachments"],
      "user.fields": ["username"],
      "media.fields": ["url", "preview_image_url", "type"],
      expansions: ["author_id", "attachments.media_keys"],
      sort_order: "relevancy",
    });

    const users = new Map<string, string>();
    for (const user of result.includes?.users ?? []) {
      users.set(user.id, user.username);
    }

    const mediaMap = new Map<string, string>();
    for (const media of result.includes?.media ?? []) {
      const url = media.url ?? media.preview_image_url;
      if (url) {
        mediaMap.set(media.media_key, url);
      }
    }

    const tweets: TrendTweet[] = [];
    for (const tweet of result.data?.data ?? []) {
      const metrics = tweet.public_metrics;
      const mediaKeys = tweet.attachments?.media_keys ?? [];
      const mediaUrls = mediaKeys
        .map((key) => mediaMap.get(key))
        .filter((url): url is string => Boolean(url));

      tweets.push({
        id: tweet.id,
        text: tweet.text,
        authorUsername: users.get(tweet.author_id ?? "") ?? "unknown",
        lang: tweet.lang ?? lang,
        likeCount: metrics?.like_count ?? 0,
        retweetCount: metrics?.retweet_count ?? 0,
        mediaUrls,
        createdAt: tweet.created_at ?? new Date().toISOString(),
      });
    }

    // Sort by engagement (likes + retweets)
    tweets.sort((a, b) => (b.likeCount + b.retweetCount) - (a.likeCount + a.retweetCount));

    return tweets;
  }

  /**
   * Download an image from a URL and return the buffer.
   */
  async downloadImage(url: string): Promise<Buffer> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
    }
    return Buffer.from(await response.arrayBuffer());
  }

  /**
   * Upload media and publish a tweet.
   */
  async publishTweet(text: string, imageBuffer?: Buffer): Promise<{ id: string }> {
    let mediaId: string | undefined;

    if (imageBuffer) {
      // v1 API needed for media upload
      mediaId = await this.writeClient.v1.uploadMedia(imageBuffer, {
        mimeType: "image/jpeg",
      });
    }

    const tweetPayload: Record<string, unknown> = { text };
    if (mediaId) {
      tweetPayload.media = { media_ids: [mediaId] };
    }

    const result = await this.writeClient.v2.tweet(tweetPayload);
    return { id: result.data.id };
  }
}
