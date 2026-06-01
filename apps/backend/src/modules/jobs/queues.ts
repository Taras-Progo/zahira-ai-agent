import { Queue } from "bullmq";
import { QUEUES } from "@zahira/shared";
import { bullConnection } from "../../lib/redis.js";
import type { EmbeddingSourceType } from "@zahira/types";

export interface EmbeddingJobData {
  sourceType: EmbeddingSourceType;
  sourceId: string;
}

export interface MemoryJobData {
  userId: string;
  sessionId: string;
}

export interface SummaryJobData {
  sessionId: string;
}

export interface AnalyticsJobData {
  type: string;
  userId?: string;
  sessionId?: string;
  payload?: Record<string, unknown>;
}

const defaultJobOptions = {
  attempts: 3,
  backoff: { type: "exponential" as const, delay: 2000 },
  removeOnComplete: 100,
  removeOnFail: 200,
};

export const embeddingQueue = new Queue<EmbeddingJobData>(QUEUES.EMBEDDING, {
  connection: bullConnection,
  defaultJobOptions,
});

export const memoryQueue = new Queue<MemoryJobData>(QUEUES.MEMORY, {
  connection: bullConnection,
  defaultJobOptions,
});

export const summaryQueue = new Queue<SummaryJobData>(QUEUES.SUMMARY, {
  connection: bullConnection,
  defaultJobOptions,
});

export const analyticsQueue = new Queue<AnalyticsJobData>(QUEUES.ANALYTICS, {
  connection: bullConnection,
  defaultJobOptions,
});

export const allQueues = [
  embeddingQueue,
  memoryQueue,
  summaryQueue,
  analyticsQueue,
];

// ----- Enqueue helpers -----

export function enqueueEmbedding(data: EmbeddingJobData) {
  return embeddingQueue.add("reembed", data, { jobId: `embed:${data.sourceType}:${data.sourceId}` });
}

export function enqueueMemoryExtraction(data: MemoryJobData) {
  return memoryQueue.add("extract", data);
}

export function enqueueSummary(data: SummaryJobData) {
  return summaryQueue.add("summarize", data);
}

export function enqueueAnalytics(data: AnalyticsJobData) {
  return analyticsQueue.add("track", data);
}

/** Total waiting+active jobs across all queues, for the health page. */
export async function getQueueDepth(): Promise<number> {
  const counts = await Promise.all(
    allQueues.map((q) => q.getJobCounts("waiting", "active", "delayed")),
  );
  return counts.reduce(
    (sum, c) => sum + (c.waiting ?? 0) + (c.active ?? 0) + (c.delayed ?? 0),
    0,
  );
}
