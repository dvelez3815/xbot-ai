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
  /** Maximum posts per day */
  postsPerDay: number;
  /** Minimum minutes between posts */
  minIntervalMinutes: number;
  /** Maximum minutes between posts */
  maxIntervalMinutes: number;
  /** Preferred posting hours (0-23) for higher activity */
  peakHours: number[];
}

export interface XCredentials {
  bearerToken: string;
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessSecret: string;
}

export interface AIConfig {
  provider: "ollama" | "anthropic";
  baseUrl: string;
  apiKey: string;
  model: string;
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
