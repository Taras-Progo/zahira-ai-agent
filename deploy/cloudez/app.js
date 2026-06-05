// OpenLiteSpeed Node appserver bootstrap (Cloudez / lsnode).
//
// OpenLiteSpeed runs this file as the Node app's `startupFile` via the lsnode
// LSAPI bridge. lsnode intercepts `http.Server.listen()` IN THIS PROCESS and
// wires it to LiteSpeed, so the server MUST be loaded in-process here (we must
// NOT spawn a child -- a child's listener is invisible to lsnode).
//
// Layout on the server (relative to this file at <app>/www/app.js):
//   <app>/www/app.js   <- this bootstrap (startupFile)
//   <app>/.env         <- env injected by OLS (also read by the app)
//   <app>/app          <- cloned repo (REPO_DIR)
//
// Override with env vars ZAHIRA_REPO_DIR / NODE_SOCKET if your paths differ.

const path = require("path");

const APP_BASE = path.resolve(__dirname, "..");
const REPO_DIR = process.env.ZAHIRA_REPO_DIR || path.join(APP_BASE, "app");
const SOCKET =
  process.env.NODE_SOCKET || path.join(APP_BASE, "etc", "nodejs", "nodejs.sock");

process.env.NODE_SOCKET = SOCKET;
process.env.NODE_ENV = process.env.NODE_ENV || "production";
// Tell the combined server it is running under lsnode so it lets lsnode own the
// listening socket (no mkdir/unlink/chmod on a real socket file).
process.env.ZAHIRA_LSNODE = "1";

// Resolve .env and the exported frontend (apps/frontend/out) relative to repo.
try {
  process.chdir(REPO_DIR);
} catch (err) {
  console.error("Could not chdir to repo:", REPO_DIR, err);
}

// Register tsx so this CommonJS process can require the TypeScript entrypoint.
require(
  path.join(REPO_DIR, "apps", "backend", "node_modules", "tsx", "dist", "cjs", "index.cjs"),
);

// Loading this module creates the Express app, starts the in-process workers,
// and calls app.listen(...) -- which lsnode intercepts and bridges to LiteSpeed.
require(path.join(REPO_DIR, "apps", "backend", "src", "combined-server.ts"));
