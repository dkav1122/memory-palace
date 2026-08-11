import type Database from "better-sqlite3";
import { countTicketsByStatus } from "./db.js";
import type { WorkflowConfig } from "./types.js";

const DEFAULT_INTERVAL_MS = 15_000;

/**
 * Reconciliation loop skeleton. Phase 0 only proves the loop runs; the real
 * gates arrive later: execution WIP gate (Phase 3/4), stranded-ticket
 * recovery (Phase 2+), Reddit polling (Phase 5).
 */
export function startReconciler(
  db: Database.Database,
  _config: WorkflowConfig,
  intervalMs = DEFAULT_INTERVAL_MS,
): () => void {
  const tick = () => {
    const counts = countTicketsByStatus(db);
    const summary = Object.entries(counts)
      .map(([status, n]) => `${status}=${n}`)
      .join(" ");
    console.log(`[reconciler] tick ${new Date().toISOString()} tickets: ${summary || "none"}`);
  };

  tick();
  const timer = setInterval(tick, intervalMs);
  return () => clearInterval(timer);
}
