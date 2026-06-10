import { describe, expect, it } from "vitest";
import { AiExit, Intent } from "@zahira/types";
import {
  ConversationPhase,
  enforcePolicy,
  parseAiEnvelope,
} from "./conversation-policy.service.js";

const limits = {
  maxQualifyingQuestions: 3,
  maxBookingAttempts: 2,
  maxSalesPitches: 1,
};

describe("conversation policy", () => {
  it("routes the 4th qualifying question to human handoff", () => {
    const result = enforcePolicy({
      session: { qualifyingQuestionCount: 3 },
      intent: Intent.GENERAL_QUESTION,
      envelope: {
        reply: "Posso te fazer mais uma pergunta?",
        asked_question: true,
      },
      limits,
      defaultAiExit: AiExit.CONTINUE,
    });

    expect(result.aiExit).toBe(AiExit.SUPPORT);
    expect(result.phase).toBe(ConversationPhase.SUPPORT);
    expect(result.handoffReason).toBe("qualifying_question_limit");
  });

  it("routes the 3rd booking attempt to human handoff", () => {
    const result = enforcePolicy({
      session: { bookingAttemptCount: 2 },
      intent: Intent.BOOKING,
      envelope: {
        reply: "Quer ver horarios?",
        scheduling_attempt: true,
      },
      limits,
      defaultAiExit: AiExit.BOOKING,
    });

    expect(result.aiExit).toBe(AiExit.SUPPORT);
    expect(result.handoffReason).toBe("booking_attempt_limit");
  });

  it("blocks repeated sales pitch", () => {
    const result = enforcePolicy({
      session: { salesPitchCount: 1 },
      intent: Intent.GENERAL_QUESTION,
      envelope: {
        reply: "Esse tratamento e perfeito para voce...",
        sales_pitch: true,
      },
      limits,
      defaultAiExit: AiExit.CONTINUE,
    });

    expect(result.aiExit).toBe(AiExit.SUPPORT);
    expect(result.handoffReason).toBe("sales_pitch_limit");
  });

  it("parses the AI response envelope", () => {
    const parsed = parseAiEnvelope(
      '{"reply":"Oi!","phase":"DISCOVERY","asked_question":false,"scheduling_attempt":false,"sales_pitch":false,"should_handoff":false}',
    );

    expect(parsed.reply).toBe("Oi!");
    expect(parsed.phase).toBe("DISCOVERY");
  });
});
