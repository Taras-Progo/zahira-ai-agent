import { Router } from "express";
import { asyncHandler } from "../../lib/async-handler.js";
import { requireAuth } from "../../middleware/auth.js";
import { notFound } from "../../lib/errors.js";
import { prisma } from "../../lib/prisma.js";

export const conversationsRouter: Router = Router();

conversationsRouter.use(requireAuth);

conversationsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const sessions = await prisma.session.findMany({
      orderBy: { lastActivityAt: "desc" },
      include: { user: true, _count: { select: { messages: true } } },
      take: 200,
    });
    res.json(
      sessions.map((s) => ({
        session_id: s.id,
        phone: s.user.phone,
        messages_count: s._count.messages,
        status: s.status,
        started_at: s.startedAt.toISOString(),
        last_activity_at: s.lastActivityAt.toISOString(),
      })),
    );
  }),
);

conversationsRouter.get(
  "/:sessionId",
  asyncHandler(async (req, res) => {
    const session = await prisma.session.findUnique({
      where: { id: req.params.sessionId! },
      include: {
        user: true,
        messages: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!session) throw notFound("Conversa não encontrada");

    res.json({
      session_id: session.id,
      phone: session.user.phone,
      status: session.status,
      started_at: session.startedAt.toISOString(),
      messages: session.messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        intent: m.intent,
        ai_exit: m.aiExit,
        created_at: m.createdAt.toISOString(),
      })),
    });
  }),
);
