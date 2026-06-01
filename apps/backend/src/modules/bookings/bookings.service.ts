import { BookingStatus, type BookingDTO } from "@zahira/types";
import { prisma } from "../../lib/prisma.js";
import { notFound } from "../../lib/errors.js";

export async function createFromConversation(params: {
  userId: string;
  sessionId: string;
  serviceId?: string | null;
  notes?: string;
}) {
  return prisma.booking.create({
    data: {
      userId: params.userId,
      sessionId: params.sessionId,
      serviceId: params.serviceId ?? null,
      notes: params.notes,
      status: BookingStatus.REQUESTED,
    },
  });
}

export async function list(): Promise<BookingDTO[]> {
  const rows = await prisma.booking.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: true, service: true },
    take: 200,
  });
  return rows.map((b) => ({
    id: b.id,
    user_id: b.userId,
    phone: b.user.phone,
    session_id: b.sessionId,
    service_id: b.serviceId,
    service_name: b.service?.serviceName ?? null,
    status: b.status,
    notes: b.notes,
    created_at: b.createdAt.toISOString(),
  }));
}

export async function update(
  id: string,
  patch: { status?: string; notes?: string },
) {
  const existing = await prisma.booking.findUnique({ where: { id } });
  if (!existing) throw notFound("Reserva não encontrada");
  return prisma.booking.update({
    where: { id },
    data: {
      status: patch.status as BookingStatus | undefined,
      notes: patch.notes,
    },
  });
}
