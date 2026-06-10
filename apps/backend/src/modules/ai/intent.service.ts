import { Intent } from "@zahira/types";
import { PROMPT_KEYS } from "@zahira/shared";
import { getAIProvider } from "./ai.service.js";
import { resolveActive } from "../prompts/prompts.service.js";
import { logger } from "../../lib/logger.js";

const VALID_INTENTS = new Set<string>(Object.values(Intent));

/** Quick keyword heuristics (Portuguese) used as a fast path / fallback. */
function heuristicIntent(message: string): Intent | null {
  const m = message.toLowerCase();
  if (/\b(ola|olá|oi|bom dia|boa tarde|boa noite)\b/.test(m)) {
    return Intent.GREETING;
  }
  if (/\b(preco|preço|quanto custa|valor|custa|tabela)\b/.test(m)) {
    return Intent.PRICING;
  }
  if (
    /\b(funcionamento|abre|abrem|fecha|fecham|aberto|aberta|horario de atendimento|horário de atendimento|horario de funcionamento|horário de funcionamento)\b/.test(
      m,
    )
  ) {
    return Intent.OPENING_HOURS;
  }
  if (/\b(agendar|marcar|horario|horário|reservar|agendamento)\b/.test(m)) {
    return Intent.BOOKING;
  }
  if (/\b(reclama|pessimo|péssimo|horrivel|horrível|insatisfeito)\b/.test(m)) {
    return Intent.COMPLAINT;
  }
  if (/\b(menu|opcoes|opções)\b/.test(m)) return Intent.MENU;
  if (/\b(atendente|humano|pessoa|falar com alguem|falar com alguém)\b/.test(m)) {
    return Intent.HUMAN_HANDOFF;
  }
  return null;
}

/** Classify the user message into one of the supported intents. */
export async function detectIntent(message: string): Promise<Intent> {
  const heuristic = heuristicIntent(message);
  if (heuristic === Intent.OPENING_HOURS) return heuristic;

  try {
    const { content: systemPrompt } = await resolveActive(
      PROMPT_KEYS.INTENT_CLASSIFIER,
    );
    if (!systemPrompt) return heuristic ?? Intent.GENERAL_QUESTION;

    const { content } = await getAIProvider().complete({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      temperature: 0,
      maxTokens: 10,
    });

    const normalized = content.trim().toLowerCase().replace(/[^a-z_]/g, "");
    if (VALID_INTENTS.has(normalized)) return normalized as Intent;
    return heuristic ?? Intent.GENERAL_QUESTION;
  } catch (err) {
    logger.warn({ err }, "Intent detection failed, using heuristic");
    return heuristic ?? Intent.GENERAL_QUESTION;
  }
}
