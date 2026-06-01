import type { ChatMessage } from "./providers/ai-provider.interface.js";

export interface PromptParts {
  systemBase: string;
  summary?: string | null;
  memories: string[];
  contextBlock: string;
  recentMessages: { role: "user" | "assistant"; content: string }[];
  userMessage: string;
}

/**
 * Assemble the final message array for the AI provider:
 * system base + business context + memories + rolling summary + recent turns.
 * The bot must answer ONLY from provided context and never invent facts.
 */
export function buildChatMessages(parts: PromptParts): ChatMessage[] {
  const systemSegments: string[] = [parts.systemBase.trim()];

  systemSegments.push(
    "Responda SEMPRE em português do Brasil, de forma calorosa, natural e concisa, usando emojis com naturalidade. " +
      "Nunca invente preços, serviços ou políticas. Use apenas o contexto do negócio fornecido. " +
      "Se a informação não estiver disponível, admita com sinceridade e ofereça ajuda alternativa.",
  );

  if (parts.contextBlock.trim()) {
    systemSegments.push(
      `Contexto do negócio (use como única fonte de verdade):\n${parts.contextBlock}`,
    );
  }

  if (parts.memories.length > 0) {
    systemSegments.push(
      `O que você lembra sobre este cliente:\n- ${parts.memories.join("\n- ")}`,
    );
  }

  if (parts.summary) {
    systemSegments.push(`Resumo da conversa até agora:\n${parts.summary}`);
  }

  const messages: ChatMessage[] = [
    { role: "system", content: systemSegments.join("\n\n") },
  ];

  for (const m of parts.recentMessages) {
    messages.push({ role: m.role, content: m.content });
  }

  messages.push({ role: "user", content: parts.userMessage });
  return messages;
}
