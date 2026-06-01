import { EmbeddingSourceType, type KnowledgeDTO } from "@zahira/types";
import type { KnowledgeInput } from "@zahira/shared";
import { prisma } from "../../lib/prisma.js";
import { notFound } from "../../lib/errors.js";
import { enqueueEmbedding } from "../jobs/queues.js";

function toDTO(k: {
  id: string;
  title: string;
  content: string;
  category: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): KnowledgeDTO {
  return {
    id: k.id,
    title: k.title,
    content: k.content,
    category: k.category,
    is_active: k.isActive,
    created_at: k.createdAt.toISOString(),
    updated_at: k.updatedAt.toISOString(),
  };
}

export async function list(): Promise<KnowledgeDTO[]> {
  const rows = await prisma.knowledgeBase.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toDTO);
}

export async function getById(id: string): Promise<KnowledgeDTO> {
  const row = await prisma.knowledgeBase.findFirst({
    where: { id, deletedAt: null },
  });
  if (!row) throw notFound("Entrada não encontrada");
  return toDTO(row);
}

export async function create(input: KnowledgeInput): Promise<KnowledgeDTO> {
  const row = await prisma.knowledgeBase.create({
    data: {
      title: input.title,
      content: input.content,
      category: input.category,
      isActive: input.is_active ?? true,
    },
  });
  await enqueueEmbedding({
    sourceType: EmbeddingSourceType.KNOWLEDGE,
    sourceId: row.id,
  });
  return toDTO(row);
}

export async function update(
  id: string,
  input: Partial<KnowledgeInput>,
): Promise<KnowledgeDTO> {
  const existing = await prisma.knowledgeBase.findFirst({
    where: { id, deletedAt: null },
  });
  if (!existing) throw notFound("Entrada não encontrada");

  const row = await prisma.knowledgeBase.update({
    where: { id },
    data: {
      title: input.title,
      content: input.content,
      category: input.category,
      isActive: input.is_active,
    },
  });
  await enqueueEmbedding({
    sourceType: EmbeddingSourceType.KNOWLEDGE,
    sourceId: row.id,
  });
  return toDTO(row);
}

export async function remove(id: string): Promise<void> {
  const existing = await prisma.knowledgeBase.findFirst({
    where: { id, deletedAt: null },
  });
  if (!existing) throw notFound("Entrada não encontrada");

  await prisma.knowledgeBase.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false },
  });
  await enqueueEmbedding({
    sourceType: EmbeddingSourceType.KNOWLEDGE,
    sourceId: id,
  });
}
