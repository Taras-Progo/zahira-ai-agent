import { AiExit, Intent } from "@zahira/types";

export const ConversationPhase = {
  DISCOVERY: "DISCOVERY",
  SERVICE_INFO: "SERVICE_INFO",
  PRICING: "PRICING",
  BOOKING: "BOOKING",
  OPENING_HOURS: "OPENING_HOURS",
  SUPPORT: "SUPPORT",
  CLOSED: "CLOSED",
} as const;
export type ConversationPhase =
  (typeof ConversationPhase)[keyof typeof ConversationPhase];

export interface SessionCounters {
  mode?: string | null;
  qualifyingQuestionCount?: number;
  bookingAttemptCount?: number;
  salesPitchCount?: number;
}

export interface ConversationLimits {
  maxQualifyingQuestions: number;
  maxBookingAttempts: number;
  maxSalesPitches: number;
}

export interface AiEnvelope {
  reply: string;
  phase?: string;
  asked_question?: boolean;
  scheduling_attempt?: boolean;
  sales_pitch?: boolean;
  should_handoff?: boolean;
}

export interface PolicyResult {
  reply: string;
  aiExit: AiExit;
  phase: ConversationPhase;
  increments: {
    qualifyingQuestionCount?: { increment: number };
    bookingAttemptCount?: { increment: number };
    salesPitchCount?: { increment: number };
  };
  handoffReason?: string;
}

const VALID_PHASES = new Set<string>(Object.values(ConversationPhase));

export function parseAiEnvelope(raw: string): AiEnvelope {
  try {
    const cleaned = raw
      .trim()
      .replace(/^```(json)?/i, "")
      .replace(/```$/i, "")
      .trim();
    const parsed = JSON.parse(cleaned) as Partial<AiEnvelope>;
    return {
      reply: typeof parsed.reply === "string" ? parsed.reply : raw,
      phase: typeof parsed.phase === "string" ? parsed.phase : undefined,
      asked_question: parsed.asked_question === true,
      scheduling_attempt: parsed.scheduling_attempt === true,
      sales_pitch: parsed.sales_pitch === true,
      should_handoff: parsed.should_handoff === true,
    };
  } catch {
    return { reply: raw };
  }
}

export function phaseForIntent(intent: Intent): ConversationPhase {
  switch (intent) {
    case Intent.PRICING:
      return ConversationPhase.PRICING;
    case Intent.BOOKING:
      return ConversationPhase.BOOKING;
    case Intent.OPENING_HOURS:
      return ConversationPhase.OPENING_HOURS;
    case Intent.SUPPORT:
    case Intent.COMPLAINT:
    case Intent.HUMAN_HANDOFF:
      return ConversationPhase.SUPPORT;
    case Intent.MENU:
    case Intent.GREETING:
      return ConversationPhase.DISCOVERY;
    default:
      return ConversationPhase.SERVICE_INFO;
  }
}

export function buildPolicyBlock(params: {
  session: SessionCounters;
  limits: ConversationLimits;
  phase: ConversationPhase;
  openingHoursSummary: string;
}): string {
  const { session, limits, phase, openingHoursSummary } = params;
  return [
    "Politica de conversa obrigatoria:",
    `- Fase atual: ${phase}.`,
    `- Perguntas de qualificacao: ${session.qualifyingQuestionCount ?? 0}/${limits.maxQualifyingQuestions}.`,
    `- Tentativas de agendamento: ${session.bookingAttemptCount ?? 0}/${limits.maxBookingAttempts}.`,
    `- Discursos de venda: ${session.salesPitchCount ?? 0}/${limits.maxSalesPitches}.`,
    "- Responda com no maximo 450 caracteres.",
    "- Faca no maximo 1 pergunta por resposta.",
    "- Se guiar o cliente, ofereca 2 ou 3 opcoes simples.",
    "- Nao confirme disponibilidade, data, horario ou profissional.",
    "- Nao saia do escopo Zahira: servicos, categorias, precos, agenda, horarios e suporte.",
    `Horario de funcionamento: ${openingHoursSummary}`,
    "Retorne apenas JSON valido com: reply, phase, asked_question, scheduling_attempt, sales_pitch, should_handoff.",
  ].join("\n");
}

function normalizePhase(intent: Intent, phase?: string): ConversationPhase {
  if (phase && VALID_PHASES.has(phase)) return phase as ConversationPhase;
  return phaseForIntent(intent);
}

function limitReply(reply: string): string {
  const trimmed = reply.trim();
  if (trimmed.length <= 600) return trimmed;
  return `${trimmed.slice(0, 597).trim()}...`;
}

function handoffReply(reason: string): string {
  if (reason === "booking_attempt_limit") {
    return "Para cuidar melhor do seu agendamento, vou te direcionar para atendimento humano, tudo bem? Assim a equipe confirma disponibilidade certinha.";
  }
  return "Para te atender com mais cuidado, vou te direcionar para uma pessoa da equipe Zahira. Assim evitamos confusao e seguimos do jeito mais humano.";
}

export function enforcePolicy(params: {
  session: SessionCounters;
  intent: Intent;
  envelope: AiEnvelope;
  limits: ConversationLimits;
  defaultAiExit: AiExit;
}): PolicyResult {
  const { session, intent, envelope, limits, defaultAiExit } = params;
  const currentQuestions = session.qualifyingQuestionCount ?? 0;
  const currentBookings = session.bookingAttemptCount ?? 0;
  const currentPitches = session.salesPitchCount ?? 0;
  const asksQuestion = envelope.asked_question === true;
  const attemptsBooking =
    envelope.scheduling_attempt === true || intent === Intent.BOOKING;
  const givesPitch = envelope.sales_pitch === true;

  let handoffReason: string | undefined;
  if (envelope.should_handoff) handoffReason = "model_requested_handoff";
  if (asksQuestion && currentQuestions + 1 > limits.maxQualifyingQuestions) {
    handoffReason = "qualifying_question_limit";
  }
  if (attemptsBooking && currentBookings + 1 > limits.maxBookingAttempts) {
    handoffReason = "booking_attempt_limit";
  }
  if (givesPitch && currentPitches + 1 > limits.maxSalesPitches) {
    handoffReason = "sales_pitch_limit";
  }

  let phase = normalizePhase(intent, envelope.phase);
  if (handoffReason) phase = ConversationPhase.SUPPORT;
  if (defaultAiExit === AiExit.END_SESSION) phase = ConversationPhase.CLOSED;

  return {
    reply: handoffReason ? handoffReply(handoffReason) : limitReply(envelope.reply),
    aiExit: handoffReason ? AiExit.SUPPORT : defaultAiExit,
    phase,
    handoffReason,
    increments: {
      ...(asksQuestion ? { qualifyingQuestionCount: { increment: 1 } } : {}),
      ...(attemptsBooking ? { bookingAttemptCount: { increment: 1 } } : {}),
      ...(givesPitch ? { salesPitchCount: { increment: 1 } } : {}),
    },
  };
}
