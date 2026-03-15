import type { AIProvider, ChatMessage, CompletionResult } from "./provider.js";
import { cleanModelOutput } from "./utils.js";
import { debug } from "../logger.js";

export class OllamaProvider implements AIProvider {
  readonly name = "ollama";
  private baseUrl: string;
  private model: string;
  private timeoutMs: number;

  constructor(baseUrl: string, model: string, timeoutSeconds: number) {
    this.baseUrl = baseUrl;
    this.model = model;
    this.timeoutMs = timeoutSeconds * 1000;
  }

  async chatCompletion(messages: ChatMessage[], tag: string): Promise<CompletionResult> {
    const payload = { model: this.model, messages, stream: false };

    debug(`${tag}:request`, {
      provider: this.name,
      url: `${this.baseUrl}/api/chat`,
      model: this.model,
      messageCount: messages.length,
    });
    debug(`${tag}:prompt`, messages.map((m) => `[${m.role}] ${m.content}`).join("\n\n"));

    const start = Date.now();
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!response.ok) {
      const body = await response.text();
      debug(`${tag}:error`, { status: response.status, body });
      throw new Error(`Ollama error: ${response.status} ${body}`);
    }

    const data = (await response.json()) as {
      message: { content: string };
      eval_count?: number;
    };
    const elapsedMs = Date.now() - start;
    const rawText = data.message.content.trim();
    const text = cleanModelOutput(rawText);

    if (rawText.length !== text.length) {
      debug(`${tag}:cleaned`, `${rawText.length} -> ${text.length} chars (stripped ${rawText.length - text.length} thinking tokens)`);
    }

    const stats = {
      elapsedMs,
      outputTokens: data.eval_count,
      tokensPerSec: data.eval_count ? data.eval_count / (elapsedMs / 1000) : undefined,
    };

    debug(`${tag}:response`, text);
    debug(`${tag}:stats`, {
      elapsed: `${elapsedMs}ms`,
      tokens: stats.outputTokens ?? "unknown",
      tokensPerSec: stats.tokensPerSec ? `${stats.tokensPerSec.toFixed(1)} t/s` : "unknown",
    });

    return { text, stats };
  }
}
