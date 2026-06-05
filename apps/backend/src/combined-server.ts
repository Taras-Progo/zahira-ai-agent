import { chmodSync, existsSync, mkdirSync, unlinkSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { createEmbeddingWorker } from "./modules/jobs/workers/embedding.worker.js";
import { createMemoryWorker } from "./modules/jobs/workers/memory.worker.js";
import { createSummaryWorker } from "./modules/jobs/workers/summary.worker.js";
import { createAnalyticsWorker } from "./modules/jobs/workers/analytics.worker.js";

// Single-process production entry for constrained/managed hosts (e.g. Cloudez):
// serves the API + the exported admin dashboard and runs the BullMQ workers,
// all in one process listening on a Unix socket (or a TCP port locally).

const here = dirname(fileURLToPath(import.meta.url));
const staticDir = resolve(here, "../../frontend/out");

const app = createApp({ staticDir });

const workers = [
  createEmbeddingWorker(),
  createMemoryWorker(),
  createSummaryWorker(),
  createAnalyticsWorker(),
];
logger.info(`Workers started in-process (${workers.length} queues)`);

// NODE_SOCKET (Cloudez) takes precedence; otherwise listen on a TCP port.
const socketPath = process.env.NODE_SOCKET;
// Under OpenLiteSpeed/lsnode the listen() call is intercepted and bridged to
// LiteSpeed; lsnode owns the actual socket, so we must not touch a socket file.
const underLsnode = process.env.ZAHIRA_LSNODE === "1";

function onReady(target: string) {
  const served = existsSync(staticDir) ? "with dashboard" : "API only";
  logger.info(`Zahira combined server listening on ${target} (${served})`);
}

let server: ReturnType<typeof app.listen>;

if (underLsnode) {
  // lsnode intercepts listen(); the argument is effectively ignored.
  server = app.listen(socketPath ?? 0, () => onReady("lsnode (LiteSpeed LSAPI)"));
} else if (socketPath) {
  // Ensure the socket's parent directory exists, then bind a real Unix socket.
  try {
    mkdirSync(dirname(socketPath), { recursive: true });
  } catch {
    /* directory may already exist */
  }
  if (existsSync(socketPath)) {
    try {
      unlinkSync(socketPath);
    } catch {
      /* ignore stale socket removal errors */
    }
  }
  server = app.listen(socketPath, () => {
    try {
      chmodSync(socketPath, 0o777);
    } catch {
      /* the proxy may already have access */
    }
    onReady(`socket ${socketPath}`);
  });
} else {
  server = app.listen(env.BACKEND_PORT, () => onReady(`port ${env.BACKEND_PORT}`));
}

async function shutdown(signal: string) {
  logger.info(`${signal} received, shutting down combined server`);
  await Promise.all(workers.map((w) => w.close()));
  server.close(() => process.exit(0));
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
