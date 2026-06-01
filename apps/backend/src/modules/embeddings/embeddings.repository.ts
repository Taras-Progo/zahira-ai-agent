import { Prisma } from "@prisma/client";
import { toVectorLiteral } from "@zahira/shared";
import type { EmbeddingSourceType } from "@zahira/types";
import { prisma } from "../../lib/prisma.js";

export interface RetrievedChunk {
  id: string;
  sourceType: EmbeddingSourceType;
  sourceId: string;
  content: string;
  distance: number;
}

/** Delete all embedding chunks for a given source (before re-embedding). */
export async function deleteBySource(
  sourceType: EmbeddingSourceType,
  sourceId: string,
): Promise<void> {
  await prisma.$executeRaw`
    DELETE FROM embeddings
    WHERE source_type = ${sourceType}::"EmbeddingSourceType"
      AND source_id = ${sourceId}
  `;
}

/** Insert one embedding chunk using a raw query (pgvector column). */
export async function insertChunk(params: {
  sourceType: EmbeddingSourceType;
  sourceId: string;
  chunkIndex: number;
  content: string;
  embedding: number[];
}): Promise<void> {
  const vectorLiteral = toVectorLiteral(params.embedding);
  await prisma.$executeRaw`
    INSERT INTO embeddings (source_type, source_id, chunk_index, content, embedding, created_at)
    VALUES (
      ${params.sourceType}::"EmbeddingSourceType",
      ${params.sourceId},
      ${params.chunkIndex},
      ${params.content},
      ${vectorLiteral}::vector,
      now()
    )
  `;
}

/** Cosine-similarity nearest-neighbour search across all embeddings. */
export async function search(
  queryEmbedding: number[],
  topK: number,
): Promise<RetrievedChunk[]> {
  const vectorLiteral = toVectorLiteral(queryEmbedding);
  const rows = await prisma.$queryRaw<
    {
      id: bigint;
      source_type: EmbeddingSourceType;
      source_id: string;
      content: string;
      distance: number;
    }[]
  >(Prisma.sql`
    SELECT id, source_type, source_id, content,
           embedding <=> ${vectorLiteral}::vector AS distance
    FROM embeddings
    ORDER BY embedding <=> ${vectorLiteral}::vector
    LIMIT ${topK}
  `);

  return rows.map((r) => ({
    id: r.id.toString(),
    sourceType: r.source_type,
    sourceId: r.source_id,
    content: r.content,
    distance: Number(r.distance),
  }));
}
