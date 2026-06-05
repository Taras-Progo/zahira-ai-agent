// Cloudez Node-app bootstrap.
//
// Cloudez runs this file (www/app.js) and proxies HTTP to a Unix socket. We
// spawn the Zahira combined server (API + dashboard + workers) via tsx, telling
// it to listen on that socket.
//
// Layout on the server (relative to this file at <app>/www/app.js):
//   <app>/www/app.js   <- this bootstrap
//   <app>/etc/nodejs/nodejs.sock  <- socket Cloudez proxies to
//   <app>/app          <- cloned repo (REPO_DIR)
//
// Override with env vars ZAHIRA_REPO_DIR and NODE_SOCKET if your paths differ.

const path = require("path");
const { spawn } = require("child_process");

const APP_BASE = path.resolve(__dirname, "..");
const REPO_DIR = process.env.ZAHIRA_REPO_DIR || path.join(APP_BASE, "app");
const SOCKET =
  process.env.NODE_SOCKET || path.join(APP_BASE, "etc", "nodejs", "nodejs.sock");

// Run via the current node + tsx's CLI directly, so we don't depend on PATH or
// shell shebang resolution. tsx (a backend devDependency) lives under
// apps/backend/node_modules with pnpm.
const tsxCli = path.join(
  REPO_DIR,
  "apps",
  "backend",
  "node_modules",
  "tsx",
  "dist",
  "cli.mjs",
);
const entry = path.join(REPO_DIR, "apps", "backend", "src", "combined-server.ts");

const child = spawn(process.execPath, [tsxCli, entry], {
  cwd: REPO_DIR,
  stdio: "inherit",
  env: { ...process.env, NODE_SOCKET: SOCKET, NODE_ENV: "production" },
});

child.on("exit", (code) => process.exit(code ?? 0));
process.on("SIGTERM", () => child.kill("SIGTERM"));
process.on("SIGINT", () => child.kill("SIGINT"));
