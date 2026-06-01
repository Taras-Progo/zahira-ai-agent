import type { Prisma } from "@prisma/client";
import { BookingStatus, SessionStatus, type DashboardAnalytics } from "@zahira/types";
import { prisma } from "../../lib/prisma.js";

/** Record an append-only analytics event (called from the analytics worker). */
export async function track(data: {
  type: string;
  userId?: string;
  sessionId?: string;
  payload?: Record<string, unknown>;
}) {
  await prisma.analyticsEvent.create({
    data: {
      type: data.type,
      userId: data.userId,
      sessionId: data.sessionId,
      payload: (data.payload ?? {}) as Prisma.InputJsonValue,
    },
  });
}

export async function dashboard(): Promise<DashboardAnalytics> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [
    totalConversations,
    messagesToday,
    activeSessions,
    handoffs,
    bookings,
    topServicesRaw,
  ] = await Promise.all([
    prisma.session.count(),
    prisma.message.count({ where: { createdAt: { gte: startOfDay } } }),
    prisma.session.count({ where: { status: SessionStatus.ACTIVE } }),
    prisma.handoff.count(),
    prisma.booking.count({ where: { status: { not: BookingStatus.CANCELLED } } }),
    prisma.booking.groupBy({
      by: ["serviceId"],
      _count: { serviceId: true },
      where: { serviceId: { not: null } },
      orderBy: { _count: { serviceId: "desc" } },
      take: 5,
    }),
  ]);

  const serviceIds = topServicesRaw
    .map((r) => r.serviceId)
    .filter((id): id is string => id !== null);
  const services = await prisma.service.findMany({
    where: { id: { in: serviceIds } },
    select: { id: true, serviceName: true },
  });
  const nameById = new Map(services.map((s) => [s.id, s.serviceName]));

  const top_services = topServicesRaw.map((r) => ({
    service_name: r.serviceId ? (nameById.get(r.serviceId) ?? "Desconhecido") : "Desconhecido",
    count: r._count.serviceId,
  }));

  return {
    total_conversations: totalConversations,
    messages_today: messagesToday,
    active_sessions: activeSessions,
    handoffs,
    bookings,
    top_services,
  };
}
