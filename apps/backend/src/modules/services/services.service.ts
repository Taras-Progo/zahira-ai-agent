import type { Prisma } from "@prisma/client";
import { EmbeddingSourceType, type ServiceDTO } from "@zahira/types";
import type { ServiceInput } from "@zahira/shared";
import { prisma } from "../../lib/prisma.js";
import { notFound } from "../../lib/errors.js";
import { enqueueEmbedding } from "../jobs/queues.js";

function toDTO(s: {
  id: string;
  serviceName: string;
  category: string | null;
  description: string | null;
  price: string | null;
  duration: string | null;
  faq: unknown;
  keywords: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): ServiceDTO {
  return {
    id: s.id,
    service_name: s.serviceName,
    category: s.category,
    description: s.description,
    price: s.price,
    duration: s.duration,
    faq: Array.isArray(s.faq) ? (s.faq as string[]) : [],
    keywords: s.keywords,
    is_active: s.isActive,
    created_at: s.createdAt.toISOString(),
    updated_at: s.updatedAt.toISOString(),
  };
}

export async function list(): Promise<ServiceDTO[]> {
  const rows = await prisma.service.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toDTO);
}

export async function getById(id: string): Promise<ServiceDTO> {
  const row = await prisma.service.findFirst({ where: { id, deletedAt: null } });
  if (!row) throw notFound("Serviço não encontrado");
  return toDTO(row);
}

export async function create(input: ServiceInput): Promise<ServiceDTO> {
  const row = await prisma.service.create({
    data: {
      serviceName: input.service_name,
      category: input.category,
      description: input.description,
      price: input.price,
      duration: input.duration,
      faq: (input.faq ?? []) as Prisma.InputJsonValue,
      keywords: input.keywords ?? [],
      isActive: input.is_active ?? true,
    },
  });
  await enqueueEmbedding({
    sourceType: EmbeddingSourceType.SERVICE,
    sourceId: row.id,
  });
  return toDTO(row);
}

export async function update(
  id: string,
  input: Partial<ServiceInput>,
): Promise<ServiceDTO> {
  const existing = await prisma.service.findFirst({
    where: { id, deletedAt: null },
  });
  if (!existing) throw notFound("Serviço não encontrado");

  const row = await prisma.service.update({
    where: { id },
    data: {
      serviceName: input.service_name,
      category: input.category,
      description: input.description,
      price: input.price,
      duration: input.duration,
      faq:
        input.faq !== undefined
          ? (input.faq as Prisma.InputJsonValue)
          : undefined,
      keywords: input.keywords,
      isActive: input.is_active,
    },
  });
  await enqueueEmbedding({
    sourceType: EmbeddingSourceType.SERVICE,
    sourceId: row.id,
  });
  return toDTO(row);
}

/** Soft delete + clear embeddings (handled by the embedding job seeing it gone). */
export async function remove(id: string): Promise<void> {
  const existing = await prisma.service.findFirst({
    where: { id, deletedAt: null },
  });
  if (!existing) throw notFound("Serviço não encontrado");

  await prisma.service.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false },
  });
  await enqueueEmbedding({
    sourceType: EmbeddingSourceType.SERVICE,
    sourceId: id,
  });
}
