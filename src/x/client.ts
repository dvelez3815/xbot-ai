import { TwitterApi } from "twitter-api-v2";
import type { XCredentials, TrendTweet } from "../types.js";
import { X_RESERVED_OPERATORS } from "../constants.js";
import { debug } from "../logger.js";

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

    debug("x:init", "X API clients initialized (read + write)");
  }

  /**
   * Search recent tweets about a topic in a specific language.
   * Sorted by relevance (engagement).
   */
  async searchTrending(query: string, lang: string, maxResults = 10, expandAuthors = false): Promise<TrendTweet[]> {
    const sanitized = query.replace(X_RESERVED_OPERATORS, "").replace(/\s+/g, " ").trim();
    const fullQuery = `(${sanitized}) lang:${lang} -is:retweet -is:reply has:media`;

    debug("x:search", { query: fullQuery, maxResults, expandAuthors });

    const expansions: string[] = ["attachments.media_keys"];
    const userFields: string[] = [];

    if (expandAuthors) {
      expansions.push("author_id");
      userFields.push("username");
    }

    const searchOptions: Record<string, unknown> = {
      max_results: Math.min(maxResults, 100),
      "tweet.fields": ["created_at", "public_metrics", "lang", "attachments"],
      "media.fields": ["url", "preview_image_url", "type"],
      expansions,
      sort_order: "relevancy",
    };

    if (userFields.length > 0) {
      searchOptions["user.fields"] = userFields;
    }

    const result = await this.readClient.v2.search(fullQuery, searchOptions);

    debug("x:search:raw", {
      dataCount: result.data?.data?.length ?? 0,
      usersCount: result.includes?.users?.length ?? 0,
      mediaCount: result.includes?.media?.length ?? 0,
    });

    const users = new Map<string, string>();
    if (expandAuthors) {
      for (const user of result.includes?.users ?? []) {
        users.set(user.id, user.username);
      }
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
        authorUsername: expandAuthors ? (users.get(tweet.author_id ?? "") ?? "anonymous") : "anonymous",
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
    debug("x:download", { url });
    const start = Date.now();

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    debug("x:download:done", { bytes: buffer.length, elapsed: `${Date.now() - start}ms` });
    return buffer;
  }

  /**
   * Upload media and publish a tweet.
   */
  async publishTweet(text: string, imageBuffer?: Buffer): Promise<{ id: string }> {
    debug("x:publish", { textLength: text.length, hasImage: Boolean(imageBuffer), imageBytes: imageBuffer?.length });

    let mediaId: string | undefined;

    if (imageBuffer) {
      debug("x:upload", "Uploading media to X...");
      // v1 API needed for media upload
      mediaId = await this.writeClient.v1.uploadMedia(imageBuffer, {
        mimeType: "image/jpeg",
      });
      debug("x:upload:done", { mediaId });
    }

    const tweetPayload: Record<string, unknown> = { text };
    if (mediaId) {
      tweetPayload.media = { media_ids: [mediaId] };
    }

    debug("x:tweet", tweetPayload);
    const result = await this.writeClient.v2.tweet(tweetPayload);
    debug("x:tweet:done", { tweetId: result.data.id });

    return { id: result.data.id };
  }

  /**
   * Reply to an existing tweet.
   */
  async replyToTweet(text: string, inReplyToId: string): Promise<{ id: string }> {
    debug("x:reply", { textLength: text.length, inReplyToId });

    const result = await this.writeClient.v2.tweet({
      text,
      reply: { in_reply_to_tweet_id: inReplyToId },
    });

    debug("x:reply:done", { tweetId: result.data.id });
    return { id: result.data.id };
  }
}
