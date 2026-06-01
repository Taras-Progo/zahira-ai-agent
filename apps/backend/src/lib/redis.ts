import { Redis } from "ioredis";
import { env } from "../config/env.js";

/**
 * Shared Redis connection for caching and rate limiting.
 * BullMQ requires its own connection options (maxRetriesPerRequest: null),
 * so queues create dedicated connections in the jobs module.
 */
export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: false,
});

export const bullConnection = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
};
