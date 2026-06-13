import { AiExit, Intent } from "@zahira/types";

/** Map a detected intent to the ai_exit routing value used by SendPulse. */
export function intentToAiExit(intent: Intent): AiExit {
  switch (intent) {
    case Intent.BOOKING:
      return AiExit.BOOKING;
    case Intent.AVAILABILITY:
      return AiExit.CONTINUE;
    case Intent.SUPPORT:
    case Intent.COMPLAINT:
    case Intent.HUMAN_HANDOFF:
      return AiExit.SUPPORT;
    case Intent.MENU:
      return AiExit.MENU;
    default:
      return AiExit.CONTINUE;
  }
}

const GOODBYE = /\b(tchau|at[ée] logo|obrigad[oa].*tchau|encerrar|finalizar)\b/i;

/** Detect an explicit end-of-session cue in the user message. */
export function isEndSession(message: string): boolean {
  return GOODBYE.test(message);
}
