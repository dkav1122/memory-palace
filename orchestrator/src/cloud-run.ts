/**
 * Shared cloud-run plumbing for agent workers (triage, execution): stream-loss
 * detection and the rehydrate-once wait. Extracted from triage.ts in Phase 4.
 */

import { Agent } from "@cursor/sdk";
import type { Run, RunResult } from "@cursor/sdk";

/** Client stream disconnects — cloud run may still finish successfully. */
export function isStreamLossError(message: string | undefined | null): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  return (
    m.includes("stream is no longer available") ||
    m.includes("stream_expired") ||
    m.includes("stream expired")
  );
}

export function isStreamLossResult(result: RunResult): boolean {
  return result.status === "error" && isStreamLossError(result.error?.message);
}

export function formatRunFailure(result: RunResult): string {
  return `run ${result.id} ended with status "${result.status}": ${result.error?.message ?? "no error detail"}`;
}

export interface WaitForRunOptions {
  agentId: string;
  apiKey: string;
  /** Log prefix, e.g. `[triage] <requestId>`. */
  logLabel: string;
  /** Invoked once when the stream is lost, before rehydration (e.g. to write a timeline event). */
  onStreamLoss?: (detail: string | undefined) => void;
}

/**
 * Wait for a run; on stream-loss, rehydrate the same cloud run via Agent.getRun
 * once (do not call stream()). Caller treats remaining stream-loss as retryable.
 */
export async function waitForRunResult(run: Run, opts: WaitForRunOptions): Promise<RunResult> {
  const result = await run.wait();
  if (!isStreamLossResult(result)) return result;

  console.warn(`${opts.logLabel} stream lost on ${run.id}; rehydrating via Agent.getRun`);
  opts.onStreamLoss?.(result.error?.message);

  try {
    const revived = await Agent.getRun(run.id, {
      runtime: "cloud",
      agentId: opts.agentId,
      apiKey: opts.apiKey,
    });
    return await revived.wait();
  } catch (err) {
    console.error(`${opts.logLabel} rehydrate failed for ${run.id}:`, err);
    return result;
  }
}
