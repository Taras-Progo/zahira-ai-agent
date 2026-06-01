import { HandoffStatus } from "@zahira/types";
import { prisma } from "../../lib/prisma.js";
import { notFound } from "../../lib/errors.js";

/** Create a pending handoff if the session has no open one. */
export async function createIfAbsent(userId: string, sessionId: string) {
  const open = await prisma.handoff.findFirst({
    where: { sessionId, status: { not: HandoffStatus.RESOLVED } },
  });
  if (open) return open;
  return prisma.handoff.create({
    data: { userId, sessionId, status: HandoffStatus.PENDING },
  });
}

export async function list() {
  const rows = await prisma.handoff.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: true },
    take: 200,
  });
  return rows.map((h) => ({
    id: h.id,
    session_id: h.sessionId,
    user_id: h.userId,
    phone: h.user.phone,
    status: h.status,
    assigned_admin_id: h.assignedAdminId,
    created_at: h.createdAt.toISOString(),
    resolved_at: h.resolvedAt?.toISOString() ?? null,
  }));
}

export async function update(
  id: string,
  patch: { status?: string; assigned_admin_id?: string | null },
) {
  const existing = await prisma.handoff.findUnique({ where: { id } });
  if (!existing) throw notFound("Solicitação não encontrada");
  const resolving = patch.status === HandoffStatus.RESOLVED;
  return prisma.handoff.update({
    where: { id },
    data: {
      status: patch.status as HandoffStatus | undefined,
      assignedAdminId:
        patch.assigned_admin_id === undefined
          ? undefined
          : patch.assigned_admin_id,
      resolvedAt: resolving ? new Date() : undefined,
    },
  });
}
