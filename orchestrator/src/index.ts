import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { loadConfig, loadCursorApiKey, loadJiraCredentials } from "./config.js";
import { openDb } from "./db.js";
import { JiraClient } from "./jira.js";
import { registerRoutes } from "./routes.js";
import { startReconciler } from "./reconciler.js";
import { createTriageWorker } from "./triage.js";

const config = loadConfig();
const db = openDb();
const jira = new JiraClient(config, loadJiraCredentials());
const triage = createTriageWorker({ db, config, jira, cursorApiKey: loadCursorApiKey() });
const startedAt = Date.now();

const app = new Hono();
// Portal pages call this API cross-origin from the game app (demo scope: no auth).
app.use("/api/*", cors());

app.get("/health", (c) => {
  let dbOk = true;
  try {
    db.prepare("SELECT 1").get();
  } catch {
    dbOk = false;
  }
  return c.json({
    ok: dbOk,
    db: dbOk,
    uptimeSec: Math.round((Date.now() - startedAt) / 1000),
    project: config.jira.projectKey,
  });
});

registerRoutes(app, { db, config, jira, triage });

const port = Number(process.env.ORCH_PORT ?? 4100);
const server = serve({ fetch: app.fetch, port }, (info) => {
  console.log(`[orchestrator] API listening on http://localhost:${info.port}`);
});

const stopReconciler = startReconciler(db, config, triage);

function shutdown(signal: string) {
  console.log(`[orchestrator] ${signal} received, shutting down`);
  stopReconciler();
  server.close();
  db.close();
  process.exit(0);
}
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
