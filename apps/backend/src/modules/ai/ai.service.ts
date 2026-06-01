import { env } from "../../config/env.js";
import type { AIProvider } from "./providers/ai-provider.interface.js";
import { OpenAIProvider } from "./providers/openai.provider.js";

let provider: AIProvider | null = null;

/** Returns the configured AI provider (singleton). */
export function getAIProvider(): AIProvider {
  if (provider) return provider;
  switch (env.AI_PROVIDER) {
    case "openai":
    default:
      provider = new OpenAIProvider();
      break;
  }
  return provider;
}
