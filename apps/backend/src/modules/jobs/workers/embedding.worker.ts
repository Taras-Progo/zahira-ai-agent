import { Worker } from "bullmq";
import { QUEUES } from "@zahira/shared";
import { bullConnection } from "../../../lib/redis.js";
import { logger } from "../../../lib/logger.js";
import { reembedSource } from "../../rag/rag.service.js";
import type { EmbeddingJobData } from "../queues.js";

export function createEmbeddingWorker(): Worker<EmbeddingJobData> {
  const worker = new Worker<EmbeddingJobData>(
    QUEUES.EMBEDDING,
    async (job) => {
      await reembedSource(job.data.sourceType, job.data.sourceId);
    },
    { connection: bullConnection, concurrency: 2 },
  );

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err }, "Embedding job failed");
  });
  return worker;
}
