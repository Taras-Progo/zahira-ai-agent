import { Intent } from "@zahira/types";
import { PROMPT_KEYS } from "@zahira/shared";
import { getAIProvider } from "./ai.service.js";
import { resolveActive } from "../prompts/prompts.service.js";
import { logger } from "../../lib/logger.js";

const VALID_INTENTS = new Set<string>(Object.values(Intent));

/** Quick keyword heuristics (Portuguese) used as a fast path / fallback. */
function heuristicIntent(message: string): Intent | null {
  const m = message.toLowerCase();
  if (/\b(ol[áa]|oi|bom dia|boa tarde|boa noite)\b/.test(m)) return Intent.GREETING;
  if (/\b(pre[çc]o|quanto custa|valor|custa|tabela)\b/.test(m)) return Intent.PRICING;
  if (/\b(agendar|marcar|hor[áa]rio|reservar|agendamento)\b/.test(m)) return Intent.BOOKING;
  if (/\b(reclama|p[ée]ssimo|horr[íi]vel|insatisfeito)\b/.test(m)) return Intent.COMPLAINT;
  if (/\b(menu|op[çc][õo]es)\b/.test(m)) return Intent.MENU;
  if (/\b(atendente|humano|pessoa|falar com algu[ée]m)\b/.test(m)) return Intent.HUMAN_HANDOFF;
  return null;
}

/** Classify the user message into one of the supported intents. */
export async function detectIntent(message: string): Promise<Intent> {
  const heuristic = heuristicIntent(message);

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
