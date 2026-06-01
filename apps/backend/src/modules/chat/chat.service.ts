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
import {
  enqueueAnalytics,
  enqueueMemoryExtraction,
  enqueueSummary,
} from "../jobs/queues.js";
import { intentToAiExit, isEndSession } from "./ai-exit.js";

/** Core AI conversation pipeline shared by SendPulse and the AI Test Panel. */
export async function processChat(input: ChatInput): Promise<ChatResponse> {
  const start = Date.now();
  const user = await sessionsService.resolveUser(input.phone);
  const session = await sessionsService.loadOrCreateSession(
    user.id,
    input.session_id,
  );

  // Persist the incoming user message immediately.
  await sessionsService.appendMessage({
    sessionId: session.id,
    role: MessageRole.USER,
    content: input.message,
  });

  const intent = await detectIntent(input.message);

  const [topK, recentWindow, maxMemories, temperature, summarizeEvery] =
    await Promise.all([
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
    ]);

  const [{ contextBlock, retrievedCount }, memories, recent, summary, systemBase] =
    await Promise.all([
      retrieveContext(input.message, topK),
      memoryService.getTopForUser(user.id, maxMemories),
      sessionsService.getRecentMessages(session.id, recentWindow),
      sessionsService.getLatestSummary(session.id),
      resolveActive(PROMPT_KEYS.SYSTEM_BASE),
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
    recentMessages,
    userMessage: input.message,
  });

  let reply = FALLBACK_REPLY;
  let tokensTotal = 0;
  let tokensPrompt = 0;
  let tokensCompletion = 0;
  let model = "fallback";
  let errorMessage: string | undefined;

  try {
    const completion = await getAIProvider().complete({ messages, temperature });
    reply = completion.content || FALLBACK_REPLY;
    tokensTotal = completion.tokensTotal;
    tokensPrompt = completion.tokensPrompt;
    tokensCompletion = completion.tokensCompletion;
    model = completion.model;
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : String(err);
    logger.error({ err }, "AI completion failed; using fallback reply");
  }

  // Determine ai_exit (END_SESSION overrides intent mapping).
  const aiExit: AiExit = isEndSession(input.message)
    ? AiExit.END_SESSION
    : intentToAiExit(intent);

  const { message: assistantMessage } = await sessionsService.appendMessage({
    sessionId: session.id,
    role: MessageRole.ASSISTANT,
    content: reply,
    intent,
    aiExit,
    tokensUsed: tokensTotal,
  });

  const { version: promptVersion } = systemBase;

  // Persist AI observability run.
  await prisma.aiRun.create({
    data: {
      sessionId: session.id,
      messageId: assistantMessage.id,
      intent,
      aiExit,
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

  // Side-effects from routing.
  if (aiExit === AiExit.BOOKING) {
    await bookingsService.createFromConversation({
      userId: user.id,
      sessionId: session.id,
    });
  } else if (aiExit === AiExit.SUPPORT) {
    await handoffService.createIfAbsent(user.id, session.id);
  } else if (aiExit === AiExit.END_SESSION) {
    await sessionsService.closeSession(session.id).catch(() => undefined);
  }

  // Async jobs (never block the reply).
  void enqueueMemoryExtraction({ userId: user.id, sessionId: session.id });
  void enqueueAnalytics({
    type: "message_processed",
    userId: user.id,
    sessionId: session.id,
    payload: { intent, ai_exit: aiExit },
  });
  if ((session.messageCount + 1) % summarizeEvery === 0) {
    void enqueueSummary({ sessionId: session.id });
  }

  return {
    reply,
    ai_exit: aiExit,
    intent: intent as Intent,
    session_id: session.id,
    metadata: {
      retrieved_documents: retrievedCount,
      tokens_used: tokensTotal,
    },
  };
}
