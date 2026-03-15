export interface BotConfig {
  /** The specific niche/topic to focus on (e.g., "artificial intelligence", "crypto", "fitness") */
  niche: string;
  /** Language code for the bot's posts (e.g., "es", "en", "pt") */
  language: string;
  /** Language codes to search trends in (e.g., ["en", "pt"]) */
  searchLanguages: string[];
  /** Max tweets to fetch per language per search */
  maxResultsPerSearch: number;
  /** Expand author info (costs $0.01/user — disable to save) */
  expandAuthors: boolean;
  /** Max characters per post (free: 280, premium: up to 25000) */
  postMaxLength: number;
  /** Active variant IDs for A/B testing */
  postVariants: string[];
  /** Seconds to wait between posts in the same cycle */
  delayBetweenPostsSeconds: number;
  /** Maximum posts per day (total across all variants) */
  postsPerDay: number;
  /** Minimum minutes between posts */
  minIntervalMinutes: number;
  /** Maximum minutes between posts */
  maxIntervalMinutes: number;
  /** Preferred posting hours (0-23) for higher activity */
  peakHours: number[];
  /** Enable replying to viral tweets in the niche */
  replyEnabled: boolean;
  /** Chance (0-100) of replying to each trending tweet */
  replyChancePercent: number;
}

export interface XCredentials {
  bearerToken: string;
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessSecret: string;
}

import type { AIProviderType } from "./constants.js";

export interface AIConfig {
  provider: AIProviderType;
  baseUrl: string;
  apiKey: string;
  model: string;
  /** Timeout in seconds for AI requests */
  timeoutSeconds: number;
}

export interface AppConfig {
  x: XCredentials;
  ai: AIConfig;
  bot: BotConfig;
}

export interface TrendTweet {
  id: string;
  text: string;
  authorUsername: string;
  lang: string;
  likeCount: number;
  retweetCount: number;
  mediaUrls: string[];
  createdAt: string;
}

export interface GeneratedPost {
  text: string;
  imageUrl?: string;
  sourceTweet: TrendTweet;
  variantId: string;
  scheduledAt?: Date;
}

export interface PostResult {
  success: boolean;
  tweetId?: string;
  error?: string;
  postedAt: Date;
}

export interface ScheduleSlot {
  time: Date;
  posted: boolean;
  post?: GeneratedPost;
}
