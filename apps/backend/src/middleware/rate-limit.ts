import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { redis } from "../lib/redis.js";

function makeStore(prefix: string) {
  return new RedisStore({
    sendCommand: (command: string, ...args: string[]) =>
      redis.call(command, ...args) as Promise<never>,
    prefix,
  });
}

/** Limits abuse of the public chat endpoint (per IP). */
export const chatRateLimit = rateLimit({
  windowMs: 60_000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeStore("rl:chat:"),
  message: {
    error: { code: "RATE_LIMITED", message: "Muitas requisições, tente novamente em instantes" },
  },
});

/** Stricter limit on login to slow brute-force attempts. */
export const loginRateLimit = rateLimit({
  windowMs: 15 * 60_000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeStore("rl:login:"),
  message: {
    error: { code: "RATE_LIMITED", message: "Muitas tentativas de login" },
  },
});
