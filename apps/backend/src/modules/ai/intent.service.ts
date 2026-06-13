import { Intent } from "@zahira/types";
import { PROMPT_KEYS } from "@zahira/shared";
import { getAIProvider } from "./ai.service.js";
import { resolveActive } from "../prompts/prompts.service.js";
import { logger } from "../../lib/logger.js";

const VALID_INTENTS = new Set<string>(Object.values(Intent));

function normalize(message: string): string {
  return message
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Quick keyword heuristics (Portuguese) used as a fast path / fallback. */
function heuristicIntent(message: string): Intent | null {
  const m = normalize(message);
  if (/\b(ola|oi|bom dia|boa tarde|boa noite)\b/.test(m)) {
    return Intent.GREETING;
  }
  if (/\b(preco|quanto custa|valor|custa|tabela)\b/.test(m)) {
    return Intent.PRICING;
  }
  if (
    /\b(disponivel|disponiveis|vaga|vagas|agenda|agendas|proximo horario|primeiro horario|horario livre|horarios livres|tem horario|tem vaga|encaixe|quem atende|quem faz|qual profissional|quais profissionais|profissional disponivel|quais servicos|servicos da|servicos do|servicos a|available|availability|appointment|appointments|slot|slots|who does|who offers|which professional|professionals available|next time|next slot)\b/.test(
      m,
    )
  ) {
    return Intent.AVAILABILITY;
  }
  if (
    /\b(funcionamento|abre|abrem|fecha|fecham|aberto|aberta|horario de atendimento|horario de funcionamento)\b/.test(
      m,
    )
  ) {
    return Intent.OPENING_HOURS;
  }
  if (/\b(agendar|marcar|horario|reservar|agendamento)\b/.test(m)) {
    return Intent.BOOKING;
  }
  if (/\b(reclama|pessimo|horrivel|insatisfeito)\b/.test(m)) {
    return Intent.COMPLAINT;
  }
  if (/\b(menu|opcoes)\b/.test(m)) return Intent.MENU;
  if (/\b(atendente|humano|pessoa|falar com alguem)\b/.test(m)) {
    return Intent.HUMAN_HANDOFF;
  }
  return null;
}

/** Classify the user message into one of the supported intents. */
export async function detectIntent(message: string): Promise<Intent> {
  const heuristic = heuristicIntent(message);
  if (heuristic === Intent.OPENING_HOURS || heuristic === Intent.AVAILABILITY) {
    return heuristic;
  }

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
