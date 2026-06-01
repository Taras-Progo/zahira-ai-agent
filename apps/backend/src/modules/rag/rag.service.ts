import { chunkText } from "@zahira/shared";
import { EmbeddingSourceType } from "@zahira/types";
import { prisma } from "../../lib/prisma.js";
import { logger } from "../../lib/logger.js";
import { getAIProvider } from "../ai/ai.service.js";
import * as embeddingsRepo from "../embeddings/embeddings.repository.js";

/** Build the embeddable text blob for a service. */
function serviceToText(s: {
  serviceName: string;
  category: string | null;
  description: string | null;
  price: string | null;
  duration: string | null;
  faq: unknown;
  keywords: string[];
}): string {
  const faq = Array.isArray(s.faq) ? (s.faq as string[]) : [];
  return [
    `Serviço: ${s.serviceName}`,
    s.category ? `Categoria: ${s.category}` : "",
    s.description ? `Descrição: ${s.description}` : "",
    s.price ? `Preço: ${s.price}` : "",
    s.duration ? `Duração: ${s.duration}` : "",
    s.keywords.length ? `Palavras-chave: ${s.keywords.join(", ")}` : "",
    faq.length ? `FAQ: ${faq.join(" | ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Regenerate embeddings for a single source (service or knowledge entry).
 * Deletes old chunks then embeds fresh ones. Called by the embedding worker.
 */
export async function reembedSource(
  sourceType: EmbeddingSourceType,
  sourceId: string,
): Promise<void> {
  let text: string | null = null;

  if (sourceType === EmbeddingSourceType.SERVICE) {
    const svc = await prisma.service.findFirst({
      where: { id: sourceId, deletedAt: null, isActive: true },
    });
    if (svc) text = serviceToText(svc);
  } else {
    const kb = await prisma.knowledgeBase.findFirst({
      where: { id: sourceId, deletedAt: null, isActive: true },
    });
    if (kb) text = `${kb.title}\n${kb.content}`;
  }

  // Always clear previous chunks first.
  await embeddingsRepo.deleteBySource(sourceType, sourceId);

  if (!text) {
    logger.info({ sourceType, sourceId }, "Source missing/inactive; embeddings cleared");
    return;
  }

  const chunks = chunkText(text);
  if (chunks.length === 0) return;

  const { embeddings } = await getAIProvider().embed(chunks);

  for (let i = 0; i < chunks.length; i++) {
    const embedding = embeddings[i];
    const content = chunks[i];
    if (!embedding || content === undefined) continue;
    await embeddingsRepo.insertChunk({
      sourceType,
      sourceId,
      chunkIndex: i,
      content,
      embedding,
    });
  }

  logger.info(
    { sourceType, sourceId, chunks: chunks.length },
    "Re-embedded source",
  );
}

export interface RagContext {
  contextBlock: string;
  retrievedCount: number;
}

/** Retrieve top-k relevant chunks for a user query and assemble a context block. */
export async function retrieveContext(
  query: string,
  topK: number,
): Promise<RagContext> {
  try {
    const { embeddings } = await getAIProvider().embed([query]);
    const queryEmbedding = embeddings[0];
    if (!queryEmbedding) return { contextBlock: "", retrievedCount: 0 };

    const chunks = await embeddingsRepo.search(queryEmbedding, topK);
    if (chunks.length === 0) return { contextBlock: "", retrievedCount: 0 };

    const contextBlock = chunks
      .map((c, i) => `[${i + 1}] ${c.content}`)
      .join("\n\n");

    return { contextBlock, retrievedCount: chunks.length };
  } catch (err) {
    logger.warn({ err }, "RAG retrieval failed; continuing without context");
    return { contextBlock: "", retrievedCount: 0 };
  }
}
