import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { loadConfig } from "./config.js";
import { openDb } from "./db.js";
import { startReconciler } from "./reconciler.js";

const config = loadConfig();
const db = openDb();
const startedAt = Date.now();

const app = new Hono();

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

const port = Number(process.env.ORCH_PORT ?? 4100);
const server = serve({ fetch: app.fetch, port }, (info) => {
  console.log(`[orchestrator] API listening on http://localhost:${info.port}`);
});

const stopReconciler = startReconciler(db, config);

function shutdown(signal: string) {
  console.log(`[orchestrator] ${signal} received, shutting down`);
  stopReconciler();
  server.close();
  db.close();
  process.exit(0);
}
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
