import { Router } from "express";
import type { SystemHealth } from "@zahira/types";
import { asyncHandler } from "../../lib/async-handler.js";
import { requireAuth } from "../../middleware/auth.js";
import { prisma } from "../../lib/prisma.js";
import { redis } from "../../lib/redis.js";
import { getAIProvider } from "../ai/ai.service.js";
import { getQueueDepth } from "../jobs/queues.js";

export const healthRouter: Router = Router();

/** Public liveness probe. */
healthRouter.get("/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

async function timed<T>(fn: () => Promise<T>): Promise<[T | null, number]> {
  const start = Date.now();
  try {
    const result = await fn();
    return [result, Date.now() - start];
  } catch {
    return [null, Date.now() - start];
  }
}

/** Detailed component health for the System Health dashboard page. */
healthRouter.get(
  "/admin/health",
  requireAuth,
  asyncHandler(async (_req, res) => {
    const [dbOk, dbMs] = await timed(() => prisma.$queryRaw`SELECT 1`);
    const [redisRes, redisMs] = await timed(() => redis.ping());
    const [aiOk, aiMs] = await timed(() => getAIProvider().ping());
    const [depth] = await timed(() => getQueueDepth());

    const database = { status: dbOk ? "ok" : "down", latency_ms: dbMs } as const;
    const redisComp = {
      status: redisRes === "PONG" ? "ok" : "down",
      latency_ms: redisMs,
    } as const;
    const openai = {
      status: aiOk ? "ok" : "down",
      latency_ms: aiMs,
    } as const;
    const queue = {
      status: depth !== null ? "ok" : "down",
      depth: depth ?? undefined,
    } as const;

    const anyDown = [database, redisComp, openai, queue].some(
      (c) => c.status === "down",
    );

    const payload: SystemHealth = {
      status: anyDown ? "degraded" : "ok",
      components: { database, redis: redisComp, openai, queue },
    };
    res.json(payload);
  }),
);
