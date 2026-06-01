import { MessageRole, SessionStatus } from "@zahira/types";
import type { AiExit, Intent } from "@zahira/types";
import { normalizePhone } from "@zahira/shared";
import { SETTING_KEYS, DEFAULT_SETTINGS } from "@zahira/shared";
import { prisma } from "../../lib/prisma.js";
import { notFound } from "../../lib/errors.js";
import * as settingsService from "../system-settings/settings.service.js";

/** Find or create a WhatsApp user by phone. */
export async function resolveUser(phone: string) {
  const normalized = normalizePhone(phone);
  const user = await prisma.user.upsert({
    where: { phone: normalized },
    create: { phone: normalized },
    update: { lastSeenAt: new Date() },
  });
  return user;
}

/**
 * Load an existing active session (by id or most recent for the user),
 * creating a new one if none exists or the last one timed out.
 */
export async function loadOrCreateSession(userId: string, sessionId?: string) {
  const timeoutMin = await settingsService.getNumber(
    SETTING_KEYS.SESSION_TIMEOUT_MINUTES,
    DEFAULT_SETTINGS.session_timeout_minutes,
  );
  const cutoff = new Date(Date.now() - timeoutMin * 60_000);

  if (sessionId) {
    const existing = await prisma.session.findFirst({
      where: { id: sessionId, userId },
    });
    if (
      existing &&
      existing.status === SessionStatus.ACTIVE &&
      existing.lastActivityAt >= cutoff
    ) {
      return existing;
    }
    if (existing && existing.status === SessionStatus.ACTIVE) {
      // timed out -> close it
      await prisma.session.update({
        where: { id: existing.id },
        data: { status: SessionStatus.CLOSED, closedAt: new Date() },
      });
    }
  } else {
    const recent = await prisma.session.findFirst({
      where: { userId, status: SessionStatus.ACTIVE },
      orderBy: { lastActivityAt: "desc" },
    });
    if (recent && recent.lastActivityAt >= cutoff) return recent;
    if (recent) {
      await prisma.session.update({
        where: { id: recent.id },
        data: { status: SessionStatus.CLOSED, closedAt: new Date() },
      });
    }
  }

  return prisma.session.create({ data: { userId } });
}

export async function appendMessage(params: {
  sessionId: string;
  role: MessageRole;
  content: string;
  intent?: Intent;
  aiExit?: AiExit;
  tokensUsed?: number;
}) {
  const message = await prisma.message.create({
    data: {
      sessionId: params.sessionId,
      role: params.role,
      content: params.content,
      intent: params.intent,
      aiExit: params.aiExit,
      tokensUsed: params.tokensUsed,
    },
  });
  const session = await prisma.session.update({
    where: { id: params.sessionId },
    data: { lastActivityAt: new Date(), messageCount: { increment: 1 } },
  });
  return { message, session };
}

/** Recent messages for short-term context, oldest first. */
export async function getRecentMessages(sessionId: string, limit: number) {
  const rows = await prisma.message.findMany({
    where: { sessionId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.reverse();
}

export async function getLatestSummary(sessionId: string) {
  return prisma.sessionSummary.findFirst({
    where: { sessionId },
    orderBy: { createdAt: "desc" },
  });
}

export async function closeSession(id: string) {
  const session = await prisma.session.findUnique({ where: { id } });
  if (!session) throw notFound("Sessão não encontrada");
  return prisma.session.update({
    where: { id },
    data: { status: SessionStatus.CLOSED, closedAt: new Date() },
  });
}

export async function listSessions(activeOnly = false) {
  const rows = await prisma.session.findMany({
    where: activeOnly ? { status: SessionStatus.ACTIVE } : {},
    orderBy: { lastActivityAt: "desc" },
    include: { user: true },
    take: 200,
  });
  return rows.map((s) => ({
    id: s.id,
    user_id: s.userId,
    phone: s.user.phone,
    status: s.status,
    message_count: s.messageCount,
    started_at: s.startedAt.toISOString(),
    last_activity_at: s.lastActivityAt.toISOString(),
    closed_at: s.closedAt?.toISOString() ?? null,
  }));
}
