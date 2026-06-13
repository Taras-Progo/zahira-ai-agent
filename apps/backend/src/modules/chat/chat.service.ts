import {
  AiExit,
  Intent,
  MessageRole,
  type ChatResponse,
} from "@zahira/types";
import {
  DEFAULT_SETTINGS,
  FALLBACK_REPLY,
  PROMPT_KEYS,
  SETTING_KEYS,
} from "@zahira/shared";
import type { ChatInput } from "@zahira/shared";
import { prisma } from "../../lib/prisma.js";
import { logger } from "../../lib/logger.js";
import { getAIProvider } from "../ai/ai.service.js";
import { detectIntent } from "../ai/intent.service.js";
import { buildChatMessages } from "../ai/prompt-builder.js";
import { resolveActive } from "../prompts/prompts.service.js";
import { retrieveContext } from "../rag/rag.service.js";
import * as sessionsService from "../sessions/sessions.service.js";
import * as memoryService from "../memory/memory.service.js";
import * as settingsService from "../system-settings/settings.service.js";
import * as bookingsService from "../bookings/bookings.service.js";
import * as handoffService from "../admin/handoff.service.js";
import { getOpeningHoursStatus } from "../business-hours/opening-hours.service.js";
import { buildAvailabilityAnswer } from "../availability/availability.service.js";
import {
  enqueueAnalytics,
  enqueueMemoryExtraction,
  enqueueSummary,
} from "../jobs/queues.js";
import { intentToAiExit, isEndSession } from "./ai-exit.js";
import {
  buildPolicyBlock,
  enforcePolicy,
  parseAiEnvelope,
  phaseForIntent,
  ConversationPhase,
} from "./conversation-policy.service.js";

/** Core AI conversation pipeline shared by SendPulse and the AI Test Panel. */
export async function processChat(
  input: ChatInput,
  options: { applyHumanDelay?: boolean } = {},
): Promise<ChatResponse> {
  const start = Date.now();
  const user = await sessionsService.resolveUser(input.phone);
  const session = await sessionsService.loadOrCreateSession(
    user.id,
    input.session_id,
  );

  await sessionsService.appendMessage({
    sessionId: session.id,
    role: MessageRole.USER,
    content: input.message,
  });

  let intent = await detectIntent(input.message);

  const [
    topK,
    recentWindow,
    maxMemories,
    temperature,
    summarizeEvery,
    maxQualifyingQuestions,
    maxBookingAttempts,
    maxSalesPitches,
    responseDelayMinMs,
    responseDelayMaxMs,
  ] = await Promise.all([
    settingsService.getNumber(
      SETTING_KEYS.RETRIEVAL_TOP_K,
      DEFAULT_SETTINGS.retrieval_top_k,
    ),
    settingsService.getNumber(
      SETTING_KEYS.RECENT_MESSAGES_WINDOW,
      DEFAULT_SETTINGS.recent_messages_window,
    ),
    settingsService.getNumber(
      SETTING_KEYS.MAX_MEMORIES,
      DEFAULT_SETTINGS.max_memories,
    ),
    settingsService.getNumber(
      SETTING_KEYS.TEMPERATURE,
      DEFAULT_SETTINGS.temperature,
    ),
    settingsService.getNumber(
      SETTING_KEYS.SUMMARIZE_EVERY_N,
      DEFAULT_SETTINGS.summarize_every_n,
    ),
    settingsService.getNumber(
      SETTING_KEYS.MAX_QUALIFYING_QUESTIONS,
      DEFAULT_SETTINGS.max_qualifying_questions,
    ),
    settingsService.getNumber(
      SETTING_KEYS.MAX_BOOKING_ATTEMPTS,
      DEFAULT_SETTINGS.max_booking_attempts,
    ),
    settingsService.getNumber(
      SETTING_KEYS.MAX_SALES_PITCHES,
      DEFAULT_SETTINGS.max_sales_pitches,
    ),
    settingsService.getNumber(
      SETTING_KEYS.RESPONSE_DELAY_MIN_MS,
      DEFAULT_SETTINGS.response_delay_min_ms,
    ),
    settingsService.getNumber(
      SETTING_KEYS.RESPONSE_DELAY_MAX_MS,
      DEFAULT_SETTINGS.response_delay_max_ms,
    ),
  ]);

  let availabilityRecent:
    | Awaited<ReturnType<typeof sessionsService.getRecentMessages>>
    | undefined;
  let availabilityFollowUp = false;
  if (intent === Intent.GENERAL_QUESTION && isAvailabilityFollowUp(input.message)) {
    availabilityRecent = await sessionsService.getRecentMessages(session.id, recentWindow);
    availabilityFollowUp =
      session.mode === ConversationPhase.AVAILABILITY ||
      hasRecentAvailabilityPrompt(availabilityRecent);
    if (availabilityFollowUp) {
      intent = Intent.AVAILABILITY;
    }
  }

  if (intent === Intent.AVAILABILITY) {
    const recent =
      availabilityRecent ??
      (await sessionsService.getRecentMessages(session.id, recentWindow));
    const answer = await buildAvailabilityAnswer({
      message: availabilityFollowUp
        ? `proximo horario disponivel ${input.message}`
        : input.message,
      recentMessages: recent
        .filter((m) => m.role !== MessageRole.SYSTEM)
        .map((m) => m.content),
    });
    const unavailableCodes = new Set([
      "service_unavailable",
      "timeout",
      "internal_error",
      "unauthorized",
      "rate_limited",
    ]);
    const aiExit: AiExit = unavailableCodes.has(answer.errorCode ?? "")
      ? AiExit.SUPPORT
      : AiExit.CONTINUE;

    await prisma.session.update({
      where: { id: session.id },
      data: {
        mode: aiExit === AiExit.SUPPORT ? ConversationPhase.SUPPORT : ConversationPhase.AVAILABILITY,
        ...(answer.errorCode ? { handoffReason: `availability_${answer.errorCode}` } : {}),
      },
    });

    const { message: assistantMessage } = await sessionsService.appendMessage({
      sessionId: session.id,
      role: MessageRole.ASSISTANT,
      content: answer.reply,
      intent,
      aiExit,
      tokensUsed: 0,
    });

    await prisma.aiRun.create({
      data: {
        sessionId: session.id,
        messageId: assistantMessage.id,
        intent,
        aiExit,
        provider: "lovable",
        model: answer.tool,
        tokensPrompt: 0,
        tokensCompletion: 0,
        tokensTotal: 0,
        retrievedDocs: 0,
        promptVersion: 0,
        latencyMs: Date.now() - start,
        error: answer.errorCode,
      },
    });

    if (aiExit === AiExit.SUPPORT) {
      await handoffService.createIfAbsent(user.id, session.id);
    }

    void enqueueMemoryExtraction({ userId: user.id, sessionId: session.id });
    void enqueueAnalytics({
      type: "message_processed",
      userId: user.id,
      sessionId: session.id,
      payload: {
        intent,
        ai_exit: aiExit,
        phase: aiExit === AiExit.SUPPORT ? ConversationPhase.SUPPORT : ConversationPhase.AVAILABILITY,
        availability_tool: answer.tool,
        availability_error: answer.errorCode,
      },
    });
    if ((session.messageCount + 1) % summarizeEvery === 0) {
      void enqueueSummary({ sessionId: session.id });
    }
    if (options.applyHumanDelay) {
      const targetLatencyMs = randomDelay(responseDelayMinMs, responseDelayMaxMs);
      const remainingDelayMs = targetLatencyMs - (Date.now() - start);
      if (remainingDelayMs > 0) await sleep(remainingDelayMs);
    }

    return {
      reply: answer.reply,
      ai_exit: aiExit,
      intent,
      session_id: session.id,
      metadata: {
        retrieved_documents: 0,
        tokens_used: 0,
      },
    };
  }

  const openingHours = await getOpeningHoursStatus();
  const phase = phaseForIntent(intent);
  const policyBlock = buildPolicyBlock({
    session,
    limits: {
      maxQualifyingQuestions,
      maxBookingAttempts,
      maxSalesPitches,
    },
    phase,
    openingHoursSummary: openingHours.summary,
  });

  const [
    { contextBlock, retrievedCount },
    memories,
    recent,
    summary,
    systemBase,
    salesPlaybook,
  ] = await Promise.all([
    retrieveContext(input.message, topK),
    memoryService.getTopForUser(user.id, maxMemories),
    sessionsService.getRecentMessages(session.id, recentWindow),
    sessionsService.getLatestSummary(session.id),
    resolveActive(PROMPT_KEYS.SYSTEM_BASE),
    resolveActive(PROMPT_KEYS.SALES_PLAYBOOK),
  ]);

  const recentMessages = recent
    .filter((m) => m.role !== MessageRole.SYSTEM)
    .map((m) => ({
      role: m.role === MessageRole.USER ? ("user" as const) : ("assistant" as const),
      content: m.content,
    }));

  const messages = buildChatMessages({
    systemBase: systemBase.content,
    summary: summary?.summary,
    memories,
    contextBlock,
    policyBlock,
    salesPlaybook: salesPlaybook.content,
    recentMessages,
    userMessage: input.message,
  });

  let rawReply = FALLBACK_REPLY;
  let tokensTotal = 0;
  let tokensPrompt = 0;
  let tokensCompletion = 0;
  let model = "fallback";
  let errorMessage: string | undefined;

  try {
    const completion = await getAIProvider().complete({
      messages,
      temperature,
      maxTokens: 500,
      responseFormat: "json_object",
    });
    rawReply = completion.content || FALLBACK_REPLY;
    tokensTotal = completion.tokensTotal;
    tokensPrompt = completion.tokensPrompt;
    tokensCompletion = completion.tokensCompletion;
    model = completion.model;
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : String(err);
    logger.error({ err }, "AI completion failed; using fallback reply");
  }

  const defaultAiExit: AiExit = isEndSession(input.message)
    ? AiExit.END_SESSION
    : intentToAiExit(intent);

  const policy = enforcePolicy({
    session,
    intent,
    envelope: parseAiEnvelope(rawReply),
    limits: {
      maxQualifyingQuestions,
      maxBookingAttempts,
      maxSalesPitches,
    },
    defaultAiExit,
  });

  await prisma.session.update({
    where: { id: session.id },
    data: {
      mode: policy.phase,
      ...(policy.handoffReason ? { handoffReason: policy.handoffReason } : {}),
      ...policy.increments,
    },
  });

  const { message: assistantMessage } = await sessionsService.appendMessage({
    sessionId: session.id,
    role: MessageRole.ASSISTANT,
    content: policy.reply,
    intent,
    aiExit: policy.aiExit,
    tokensUsed: tokensTotal,
  });

  const { version: promptVersion } = systemBase;

  await prisma.aiRun.create({
    data: {
      sessionId: session.id,
      messageId: assistantMessage.id,
      intent,
      aiExit: policy.aiExit,
      provider: getAIProvider().name,
      model,
      tokensPrompt,
      tokensCompletion,
      tokensTotal,
      retrievedDocs: retrievedCount,
      promptVersion,
      latencyMs: Date.now() - start,
      error: errorMessage,
    },
  });

  if (policy.aiExit === AiExit.BOOKING) {
    await bookingsService.createFromConversation({
      userId: user.id,
      sessionId: session.id,
    });
  } else if (policy.aiExit === AiExit.SUPPORT) {
    await handoffService.createIfAbsent(user.id, session.id);
  } else if (policy.aiExit === AiExit.END_SESSION) {
    await sessionsService.closeSession(session.id).catch(() => undefined);
  }

  void enqueueMemoryExtraction({ userId: user.id, sessionId: session.id });
  void enqueueAnalytics({
    type: "message_processed",
    userId: user.id,
    sessionId: session.id,
    payload: {
      intent,
      ai_exit: policy.aiExit,
      phase: policy.phase,
      handoff_reason: policy.handoffReason,
    },
  });
  if ((session.messageCount + 1) % summarizeEvery === 0) {
    void enqueueSummary({ sessionId: session.id });
  }

  if (options.applyHumanDelay) {
    const targetLatencyMs = randomDelay(responseDelayMinMs, responseDelayMaxMs);
    const remainingDelayMs = targetLatencyMs - (Date.now() - start);
    if (remainingDelayMs > 0) await sleep(remainingDelayMs);
  }

  return {
    reply: policy.reply,
    ai_exit: policy.aiExit,
    intent: intent as Intent,
    session_id: session.id,
    metadata: {
      retrieved_documents: retrievedCount,
      tokens_used: tokensTotal,
    },
  };
}

function randomDelay(minMs: number, maxMs: number): number {
  const safeMin = Math.max(0, Math.min(minMs, 8000));
  const safeMax = Math.max(safeMin, Math.min(maxMs, 8000));
  return Math.floor(safeMin + Math.random() * (safeMax - safeMin + 1));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isAvailabilityFollowUp(message: string): boolean {
  const normalized = message
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  return /^(sim|yes|yep|ok|okay|pode|isso|claro|proximo|next|ver proximo|ver a proxima|quero|quero sim)$/.test(
    normalized,
  );
}

function hasRecentAvailabilityPrompt(
  messages: Awaited<ReturnType<typeof sessionsService.getRecentMessages>>,
): boolean {
  const lastAssistant = [...messages]
    .reverse()
    .find((message) => message.role === MessageRole.ASSISTANT);
  if (!lastAssistant) return false;
  if (lastAssistant.intent === Intent.AVAILABILITY) return true;
  const content = lastAssistant.content
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return (
    content.includes("proxima data disponivel") ||
    content.includes("proximos horarios disponiveis") ||
    content.includes("procurar a proxima")
  );
}
