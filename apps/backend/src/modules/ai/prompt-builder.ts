import type { ChatMessage } from "./providers/ai-provider.interface.js";

export interface PromptParts {
  systemBase: string;
  summary?: string | null;
  memories: string[];
  contextBlock: string;
  policyBlock?: string;
  salesPlaybook?: string;
  recentMessages: { role: "user" | "assistant"; content: string }[];
  userMessage: string;
}

/**
 * Assemble the final message array for the AI provider:
 * system base + policy guardrails + business context + memories + recent turns.
 */
export function buildChatMessages(parts: PromptParts): ChatMessage[] {
  const systemSegments: string[] = [parts.systemBase.trim()];

  systemSegments.push(
    "Responda sempre em portugues do Brasil, de forma calorosa, natural e concisa. " +
      "Nunca invente precos, servicos, politicas, profissionais ou disponibilidade. " +
      "Use apenas o contexto do negocio fornecido. Se a informacao nao estiver disponivel, seja sincera e ofereca atendimento humano.",
  );

  systemSegments.push(
    "Formato obrigatorio: responda apenas com JSON valido, sem markdown. " +
      'Schema: {"reply":"texto ao cliente","phase":"DISCOVERY|SERVICE_INFO|PRICING|BOOKING|OPENING_HOURS|SUPPORT|CLOSED","asked_question":boolean,"scheduling_attempt":boolean,"sales_pitch":boolean,"should_handoff":boolean}.',
  );

  if (parts.policyBlock?.trim()) {
    systemSegments.push(parts.policyBlock.trim());
  }

  if (parts.salesPlaybook?.trim()) {
    systemSegments.push(`Playbook aprovado:\n${parts.salesPlaybook.trim()}`);
  }

  if (parts.contextBlock.trim()) {
    systemSegments.push(
      `Contexto do negocio (use como unica fonte de verdade):\n${parts.contextBlock}`,
    );
  }

  if (parts.memories.length > 0) {
    systemSegments.push(
      `O que voce lembra sobre este cliente:\n- ${parts.memories.join("\n- ")}`,
    );
  }

  if (parts.summary) {
    systemSegments.push(`Resumo da conversa ate agora:\n${parts.summary}`);
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
