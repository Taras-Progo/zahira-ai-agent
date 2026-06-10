export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface CompletionParams {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  responseFormat?: "json_object";
}

export interface CompletionResult {
  content: string;
  tokensPrompt: number;
  tokensCompletion: number;
  tokensTotal: number;
  model: string;
}

export interface EmbeddingResult {
  embeddings: number[][];
  model: string;
  tokensTotal: number;
}

/**
 * Provider-agnostic AI interface. Swap OpenAI for Claude/Gemini later
 * by implementing this interface without touching the pipeline.
 */
export interface AIProvider {
  readonly name: string;
  complete(params: CompletionParams): Promise<CompletionResult>;
  embed(texts: string[]): Promise<EmbeddingResult>;
  /** Lightweight reachability check for the health endpoint. */
  ping(): Promise<boolean>;
}
