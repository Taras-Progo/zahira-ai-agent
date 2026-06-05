import { existsSync } from "node:fs";
import { join } from "node:path";
import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { pinoHttp } from "pino-http";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { apiRouter } from "./routes/index.js";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";

interface CreateAppOptions {
  /** Absolute path to the exported frontend (`out/`) to serve as a SPA. */
  staticDir?: string;
}

export function createApp(options: CreateAppOptions = {}): Express {
  const app = express();

  // Behind Nginx in production: trust the first proxy for correct client IPs.
  app.set("trust proxy", 1);

  app.use(
    cors({
      origin: env.CORS_ORIGIN.split(",").map((o) => o.trim()),
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.use(pinoHttp({ logger }));

  app.use("/api", apiRouter);
  // 404 for unknown API routes only (so SPA routes fall through to static).
  app.use("/api", notFoundHandler);

  // Serve the exported admin dashboard when a static build is provided.
  if (options.staticDir && existsSync(options.staticDir)) {
    const staticDir = options.staticDir;
    app.use(express.static(staticDir, { extensions: ["html"] }));
    // SPA fallback: any non-asset GET serves the dashboard shell.
    app.get(/.*/, (req, res, next) => {
      if (req.method !== "GET") return next();
      const index = join(staticDir, "index.html");
      if (existsSync(index)) return res.sendFile(index);
      return next();
    });
  }

  app.use(errorHandler);

  return app;
}
