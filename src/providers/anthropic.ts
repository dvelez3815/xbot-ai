import type { AIProvider, ChatMessage, CompletionResult } from "./provider.js";
import { debug } from "../logger.js";

export class AnthropicProvider implements AIProvider {
  readonly name = "anthropic";
  private apiKey: string;
  private model: string;
  private maxTokens: number;
  private client: unknown;

  constructor(apiKey: string, model: string, maxTokens = 300) {
    this.apiKey = apiKey;
    this.model = model;
    this.maxTokens = maxTokens;
  }

  private async getClient() {
    if (!this.client) {
      try {
        const { default: Anthropic } = await import("@anthropic-ai/sdk");
        this.client = new Anthropic({ apiKey: this.apiKey });
      } catch {
        throw new Error("Install @anthropic-ai/sdk to use the Anthropic provider: npm install @anthropic-ai/sdk");
      }
    }
    return this.client as import("@anthropic-ai/sdk").default;
  }

  async chatCompletion(messages: ChatMessage[], tag: string): Promise<CompletionResult> {
    debug(`${tag}:request`, { provider: this.name, model: this.model, messageCount: messages.length });
    debug(`${tag}:prompt`, messages.map((m) => `[${m.role}] ${m.content}`).join("\n\n"));

    const client = await this.getClient();
    const systemMessage = messages.find((m) => m.role === "system")?.content;
    const chatMessages = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    const start = Date.now();
    const response = await client.messages.create({
      model: this.model,
      max_tokens: this.maxTokens,
      messages: chatMessages,
      system: systemMessage,
    });

    const text = response.content[0].type === "text" ? response.content[0].text.trim() : "";
    const elapsedMs = Date.now() - start;

    const stats = {
      elapsedMs,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    };

    debug(`${tag}:response`, text);
    debug(`${tag}:stats`, { elapsed: `${elapsedMs}ms`, ...stats });

    return { text, stats };
  }
}
