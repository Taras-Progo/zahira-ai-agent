import OpenAI from "openai";
import { env } from "../../../config/env.js";
import type {
  AIProvider,
  CompletionParams,
  CompletionResult,
  EmbeddingResult,
} from "./ai-provider.interface.js";

export class OpenAIProvider implements AIProvider {
  public readonly name = "openai";
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  }

  async complete(params: CompletionParams): Promise<CompletionResult> {
    const model = env.OPENAI_CHAT_MODEL;
    // Newer reasoning models (gpt-5.x, o-series) require `max_completion_tokens`
    // and only support the default temperature (1).
    const isNewModel = /^(gpt-5|o\d)/i.test(model);

    const tokenParams = isNewModel
      ? { max_completion_tokens: params.maxTokens }
      : { temperature: params.temperature ?? 0.6, max_tokens: params.maxTokens };

    const completion = await this.client.chat.completions.create({
      model,
      messages: params.messages,
      ...(params.responseFormat
        ? { response_format: { type: params.responseFormat } }
        : {}),
      ...tokenParams,
    });

    const choice = completion.choices[0];
    return {
      content: choice?.message?.content?.trim() ?? "",
      tokensPrompt: completion.usage?.prompt_tokens ?? 0,
      tokensCompletion: completion.usage?.completion_tokens ?? 0,
      tokensTotal: completion.usage?.total_tokens ?? 0,
      model: completion.model,
    };
  }

  async embed(texts: string[]): Promise<EmbeddingResult> {
    const response = await this.client.embeddings.create({
      model: env.OPENAI_EMBEDDING_MODEL,
      input: texts,
      dimensions: env.OPENAI_EMBEDDING_DIMENSIONS,
    });

    return {
      embeddings: response.data.map((d) => d.embedding),
      model: response.model,
      tokensTotal: response.usage?.total_tokens ?? 0,
    };
  }

  async ping(): Promise<boolean> {
    if (!env.OPENAI_API_KEY) return false;
    try {
      await this.client.models.list();
      return true;
    } catch {
      return false;
    }
  }
}
