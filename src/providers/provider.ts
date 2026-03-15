export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface CompletionStats {
  elapsedMs: number;
  inputTokens?: number;
  outputTokens?: number;
  tokensPerSec?: number;
}

export interface CompletionResult {
  text: string;
  stats: CompletionStats;
}

export interface AIProvider {
  readonly name: string;
  chatCompletion(messages: ChatMessage[], tag: string): Promise<CompletionResult>;
}
