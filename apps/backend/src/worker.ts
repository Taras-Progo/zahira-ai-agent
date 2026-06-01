import { logger } from "./lib/logger.js";
import { createEmbeddingWorker } from "./modules/jobs/workers/embedding.worker.js";
import { createMemoryWorker } from "./modules/jobs/workers/memory.worker.js";
import { createSummaryWorker } from "./modules/jobs/workers/summary.worker.js";
import { createAnalyticsWorker } from "./modules/jobs/workers/analytics.worker.js";

const workers = [
  createEmbeddingWorker(),
  createMemoryWorker(),
  createSummaryWorker(),
  createAnalyticsWorker(),
];

logger.info(`Zahira worker started with ${workers.length} queues`);

async function shutdown(signal: string) {
  logger.info(`${signal} received, closing workers`);
  await Promise.all(workers.map((w) => w.close()));
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
