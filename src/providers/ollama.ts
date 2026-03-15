import type { AIProvider, ChatMessage, CompletionResult } from "./provider.js";
import { cleanModelOutput } from "./utils.js";
import { EnvKeys } from "../constants.js";
import { debug } from "../logger.js";

function isDebugEnabled(): boolean {
  return process.env[EnvKeys.DEBUG] === "true" || process.env[EnvKeys.DEBUG] === "1";
}

/**
 * Parses Ollama's streaming NDJSON response, concatenating all message chunks.
 * Streaming avoids Ollama's 5min HTTP timeout on long-running generations.
 */
async function readStream(response: Response, verbose: boolean): Promise<{ content: string; evalCount?: number }> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let thinking = "";
  let content = "";
  let evalCount: number | undefined;

  if (verbose) {
    process.stdout.write("\n  [thinking] ");
  }

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    for (const line of chunk.split("\n").filter(Boolean)) {
      try {
        const data = JSON.parse(line) as {
          message?: { content: string; thinking?: string };
          done?: boolean;
          eval_count?: number;
        };

        // Thinking tokens (Qwen 3.5, DeepSeek, etc.)
        if (data.message?.thinking) {
          thinking += data.message.thinking;
          if (verbose) {
            process.stdout.write(data.message.thinking);
          }
        }

        // Content tokens (the actual response)
        if (data.message?.content) {
          // Switch label when first content token arrives
          if (content === "" && verbose && thinking.length > 0) {
            process.stdout.write("\n\n  [response] ");
          }
          content += data.message.content;
          if (verbose) {
            process.stdout.write(data.message.content);
          }
        }

        if (data.done && data.eval_count) {
          evalCount = data.eval_count;
        }
      } catch {
        // Skip malformed lines
      }
    }
  }

  if (verbose) {
    process.stdout.write("\n\n");
  }

  return { content, evalCount };
}

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
    const payload = {
      model: this.model,
      messages,
      stream: true,
      keep_alive: "60m",
    };

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

    const { content, evalCount } = await readStream(response, isDebugEnabled());
    const elapsedMs = Date.now() - start;
    const rawText = content.trim();
    const text = cleanModelOutput(rawText);

    if (rawText.length !== text.length) {
      debug(`${tag}:cleaned`, `${rawText.length} -> ${text.length} chars (stripped ${rawText.length - text.length} thinking tokens)`);
    }

    const stats = {
      elapsedMs,
      outputTokens: evalCount,
      tokensPerSec: evalCount ? evalCount / (elapsedMs / 1000) : undefined,
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
