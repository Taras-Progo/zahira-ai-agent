import { Worker } from "bullmq";
import { MessageRole } from "@zahira/types";
import { PROMPT_KEYS, QUEUES } from "@zahira/shared";
import { bullConnection } from "../../../lib/redis.js";
import { logger } from "../../../lib/logger.js";
import { prisma } from "../../../lib/prisma.js";
import { getAIProvider } from "../../ai/ai.service.js";
import { resolveActive } from "../../prompts/prompts.service.js";
import * as memoryService from "../../memory/memory.service.js";
import type { MemoryJobData } from "../queues.js";

interface ExtractedFact {
  content: string;
  relevance: number;
}

function parseFacts(raw: string): ExtractedFact[] {
  try {
    const cleaned = raw
      .trim()
      .replace(/^```(json)?/i, "")
      .replace(/```$/, "")
      .trim();
    const parsed = JSON.parse(cleaned) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        if (typeof item === "string") return { content: item, relevance: 0.5 };
        if (item && typeof item === "object" && "content" in item) {
          const obj = item as { content: unknown; relevance?: unknown };
          return {
            content: String(obj.content),
            relevance:
              typeof obj.relevance === "number" ? obj.relevance : 0.5,
          };
        }
        return null;
      })
      .filter((f): f is ExtractedFact => f !== null && f.content.length > 0);
  } catch {
    return [];
  }
}

export function createMemoryWorker(): Worker<MemoryJobData> {
  const worker = new Worker<MemoryJobData>(
    QUEUES.MEMORY,
    async (job) => {
      const { userId, sessionId } = job.data;
      const { content: prompt } = await resolveActive(
        PROMPT_KEYS.MEMORY_EXTRACTOR,
      );
      if (!prompt) return;

      const messages = await prisma.message.findMany({
        where: { sessionId },
        orderBy: { createdAt: "desc" },
        take: 8,
      });
      if (messages.length === 0) return;

      const transcript = messages
        .reverse()
        .map(
          (m) =>
            `${m.role === MessageRole.USER ? "Cliente" : "Assistente"}: ${m.content}`,
        )
        .join("\n");

      const { content } = await getAIProvider().complete({
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: transcript },
        ],
        temperature: 0,
        maxTokens: 300,
      });

      const facts = parseFacts(content);
      await memoryService.addExtracted(userId, sessionId, facts);
    },
    { connection: bullConnection, concurrency: 2 },
  );

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err }, "Memory job failed");
  });
  return worker;
}
