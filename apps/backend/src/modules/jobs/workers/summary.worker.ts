import { Worker } from "bullmq";
import { MessageRole } from "@zahira/types";
import { PROMPT_KEYS, QUEUES } from "@zahira/shared";
import { bullConnection } from "../../../lib/redis.js";
import { logger } from "../../../lib/logger.js";
import { prisma } from "../../../lib/prisma.js";
import { getAIProvider } from "../../ai/ai.service.js";
import { resolveActive } from "../../prompts/prompts.service.js";
import type { SummaryJobData } from "../queues.js";

export function createSummaryWorker(): Worker<SummaryJobData> {
  const worker = new Worker<SummaryJobData>(
    QUEUES.SUMMARY,
    async (job) => {
      const { sessionId } = job.data;
      const { content: prompt } = await resolveActive(PROMPT_KEYS.SUMMARIZER);
      if (!prompt) return;

      const messages = await prisma.message.findMany({
        where: { sessionId },
        orderBy: { createdAt: "asc" },
      });
      if (messages.length === 0) return;

      const transcript = messages
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
        temperature: 0.2,
        maxTokens: 400,
      });

      if (!content.trim()) return;

      const lastMessage = messages[messages.length - 1];
      await prisma.sessionSummary.create({
        data: {
          sessionId,
          summary: content.trim(),
          upToMessageId: lastMessage?.id,
          messageCountAtSummary: messages.length,
        },
      });
    },
    { connection: bullConnection, concurrency: 1 },
  );

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err }, "Summary job failed");
  });
  return worker;
}
