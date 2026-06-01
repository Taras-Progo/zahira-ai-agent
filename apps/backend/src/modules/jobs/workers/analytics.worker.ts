import { Worker } from "bullmq";
import { QUEUES } from "@zahira/shared";
import { bullConnection } from "../../../lib/redis.js";
import { logger } from "../../../lib/logger.js";
import * as analyticsService from "../../analytics/analytics.service.js";
import type { AnalyticsJobData } from "../queues.js";

export function createAnalyticsWorker(): Worker<AnalyticsJobData> {
  const worker = new Worker<AnalyticsJobData>(
    QUEUES.ANALYTICS,
    async (job) => {
      await analyticsService.track(job.data);
    },
    { connection: bullConnection, concurrency: 4 },
  );

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err }, "Analytics job failed");
  });
  return worker;
}
