import { MemoryType, type MemoryDTO } from "@zahira/types";
import { prisma } from "../../lib/prisma.js";
import { notFound } from "../../lib/errors.js";

function toDTO(m: {
  id: string;
  userId: string;
  type: string;
  content: string;
  relevanceScore: number;
  createdAt: Date;
}): MemoryDTO {
  return {
    id: m.id,
    user_id: m.userId,
    type: m.type,
    content: m.content,
    relevance_score: m.relevanceScore,
    created_at: m.createdAt.toISOString(),
  };
}

export async function getForUser(userId: string): Promise<MemoryDTO[]> {
  const rows = await prisma.memory.findMany({
    where: { userId },
    orderBy: [{ relevanceScore: "desc" }, { createdAt: "desc" }],
  });
  return rows.map(toDTO);
}

/** Top long-term memories injected into the chat prompt. */
export async function getTopForUser(userId: string, limit: number) {
  const rows = await prisma.memory.findMany({
    where: { userId, type: MemoryType.LONG_TERM },
    orderBy: [{ relevanceScore: "desc" }, { createdAt: "desc" }],
    take: limit,
  });
  return rows.map((r) => r.content);
}

export async function create(input: {
  user_id: string;
  type?: string;
  content: string;
  relevance_score?: number;
}): Promise<MemoryDTO> {
  const row = await prisma.memory.create({
    data: {
      userId: input.user_id,
      type: (input.type as MemoryType) ?? MemoryType.LONG_TERM,
      content: input.content,
      relevanceScore: input.relevance_score ?? 0.5,
    },
  });
  return toDTO(row);
}

/** Bulk insert extracted memories, skipping near-duplicates. */
export async function addExtracted(
  userId: string,
  sessionId: string,
  facts: { content: string; relevance: number }[],
): Promise<void> {
  if (facts.length === 0) return;
  const existing = await prisma.memory.findMany({
    where: { userId },
    select: { content: true },
  });
  const seen = new Set(existing.map((e) => e.content.toLowerCase().trim()));

  const fresh = facts.filter(
    (f) => f.content && !seen.has(f.content.toLowerCase().trim()),
  );
  if (fresh.length === 0) return;

  await prisma.memory.createMany({
    data: fresh.map((f) => ({
      userId,
      type: MemoryType.LONG_TERM,
      content: f.content,
      relevanceScore: Math.max(0, Math.min(1, f.relevance)),
      sourceSessionId: sessionId,
    })),
  });
}

export async function update(
  id: string,
  patch: { content?: string; relevance_score?: number },
): Promise<MemoryDTO> {
  const existing = await prisma.memory.findUnique({ where: { id } });
  if (!existing) throw notFound("Memória não encontrada");
  const row = await prisma.memory.update({
    where: { id },
    data: { content: patch.content, relevanceScore: patch.relevance_score },
  });
  return toDTO(row);
}

export async function remove(id: string): Promise<void> {
  const existing = await prisma.memory.findUnique({ where: { id } });
  if (!existing) throw notFound("Memória não encontrada");
  await prisma.memory.delete({ where: { id } });
}
