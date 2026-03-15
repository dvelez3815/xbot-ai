import type { AIConfig } from "../types.js";
import type { AIProvider } from "./provider.js";
import { AIProviders } from "../constants.js";
import { OllamaProvider } from "./ollama.js";
import { AnthropicProvider } from "./anthropic.js";
import { OpenAICompatibleProvider } from "./openai-compatible.js";

export type { AIProvider, ChatMessage, CompletionResult, CompletionStats } from "./provider.js";

export function createProvider(config: AIConfig): AIProvider {
  switch (config.provider) {
    case AIProviders.OLLAMA:
      return new OllamaProvider(config.baseUrl, config.model, config.timeoutSeconds);
    case AIProviders.ANTHROPIC:
      return new AnthropicProvider(config.apiKey, config.model);
    case AIProviders.OPENAI:
      return new OpenAICompatibleProvider(config.baseUrl, config.apiKey, config.model, config.timeoutSeconds);
    default:
      throw new Error(
        `Unknown AI provider: "${config.provider}". Valid options: ${Object.values(AIProviders).join(", ")}`
      );
  }
}
