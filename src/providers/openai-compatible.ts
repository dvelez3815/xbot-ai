import type { AIProvider, ChatMessage, CompletionResult } from "./provider.js";
import { cleanModelOutput } from "./utils.js";
import { debug } from "../logger.js";

/**
 * OpenAI-compatible provider.
 * Works with: OpenAI, Groq, Together AI, LM Studio, vLLM, Mistral, DeepSeek, etc.
 * Any service that implements POST /v1/chat/completions.
 */
export class OpenAICompatibleProvider implements AIProvider {
  readonly name = "openai";
  private baseUrl: string;
  private apiKey: string;
  private model: string;
  private timeoutMs: number;

  constructor(baseUrl: string, apiKey: string, model: string, timeoutSeconds: number) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.apiKey = apiKey;
    this.model = model;
    this.timeoutMs = timeoutSeconds * 1000;
  }

  async chatCompletion(messages: ChatMessage[], tag: string): Promise<CompletionResult> {
    const url = `${this.baseUrl}/v1/chat/completions`;

    debug(`${tag}:request`, {
      provider: this.name,
      url,
      model: this.model,
      messageCount: messages.length,
    });
    debug(`${tag}:prompt`, messages.map((m) => `[${m.role}] ${m.content}`).join("\n\n"));

    const start = Date.now();
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
      }),
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!response.ok) {
      const body = await response.text();
      debug(`${tag}:error`, { status: response.status, body });
      throw new Error(`OpenAI-compatible API error: ${response.status} ${body}`);
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
      usage?: { prompt_tokens: number; completion_tokens: number };
    };
    const elapsedMs = Date.now() - start;
    const rawText = data.choices[0]?.message.content.trim() ?? "";
    const text = cleanModelOutput(rawText);

    if (rawText.length !== text.length) {
      debug(`${tag}:cleaned`, `${rawText.length} -> ${text.length} chars (stripped thinking tokens)`);
    }

    const usage = data.usage;
    const stats = {
      elapsedMs,
      inputTokens: usage?.prompt_tokens,
      outputTokens: usage?.completion_tokens,
      tokensPerSec: usage?.completion_tokens ? usage.completion_tokens / (elapsedMs / 1000) : undefined,
    };

    debug(`${tag}:response`, text);
    debug(`${tag}:stats`, {
      elapsed: `${elapsedMs}ms`,
      inputTokens: stats.inputTokens ?? "unknown",
      outputTokens: stats.outputTokens ?? "unknown",
      tokensPerSec: stats.tokensPerSec ? `${stats.tokensPerSec.toFixed(1)} t/s` : "unknown",
    });

    return { text, stats };
  }
}
