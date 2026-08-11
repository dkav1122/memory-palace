/**
 * Triage assessment contract + tolerant extraction from agent output.
 *
 * Cloud agents have no JSON mode: the prompt demands a fenced JSON block, but
 * models occasionally wrap it in prose, drop the fence, or bend a field. The
 * extractor here recovers from all of that; genuinely unparseable output gets
 * one retry at the worker level, then the ticket is marked failed.
 */

export const SEVERITIES = ["critical", "high", "medium", "low"] as const;
export const AFFECTED_USERS = ["all", "many", "some", "few", "unknown"] as const;
export const COMPLEXITIES = ["trivial", "small", "medium", "large"] as const;

export interface TriageAssessment {
  severity: (typeof SEVERITIES)[number];
  confidence: number; // 0..1
  affected_users: (typeof AFFECTED_USERS)[number];
  reproduction: string;
  suspected_root_cause: string;
  relevant_files: string[];
  complexity: (typeof COMPLEXITIES)[number];
  evidence: string;
  proposed_fix: string;
}

export type ExtractResult =
  | { ok: true; value: TriageAssessment }
  | { ok: false; error: string };

/**
 * Pull candidate JSON strings out of free-form agent text, most-specific
 * first: last ```json fence, then any fenced block, then a balanced-brace
 * scan of the raw text.
 */
function jsonCandidates(text: string): string[] {
  const candidates: string[] = [];

  const fences = [...text.matchAll(/```(\w*)[ \t]*\r?\n([\s\S]*?)```/g)];
  const jsonFences = fences.filter((m) => (m[1] ?? "").toLowerCase() === "json");
  // Last fence wins: the prompt demands the JSON block end the reply, and a
  // retry reply may quote the earlier broken block before the corrected one.
  for (const match of [...jsonFences].reverse()) candidates.push(match[2] ?? "");
  for (const match of [...fences].reverse()) {
    if (!jsonFences.includes(match)) candidates.push(match[2] ?? "");
  }

  const braced = scanBalancedObjects(text);
  for (const block of braced.reverse()) candidates.push(block);

  return candidates;
}

/** Top-level {...} spans, tolerant of braces inside JSON strings. */
function scanBalancedObjects(text: string): string[] {
  const blocks: string[] = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"' && depth > 0) inString = true;
    else if (ch === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === "}") {
      if (depth > 0) {
        depth--;
        if (depth === 0 && start >= 0) blocks.push(text.slice(start, i + 1));
      }
    }
  }
  return blocks;
}

function asNonEmptyString(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value.trim();
  return undefined;
}

function asEnum<T extends readonly string[]>(value: unknown, allowed: T): T[number] | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  return allowed.includes(normalized) ? (normalized as T[number]) : undefined;
}

function asConfidence(value: unknown): number | undefined {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (Number.isNaN(n)) return undefined;
  return Math.min(1, Math.max(0, n));
}

function asFileList(value: unknown): string[] | undefined {
  if (typeof value === "string") return value.trim() ? [value.trim()] : [];
  if (!Array.isArray(value)) return undefined;
  const files = value.filter((v): v is string => typeof v === "string" && !!v.trim());
  return files.map((f) => f.trim());
}

function validate(parsed: unknown): ExtractResult {
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { ok: false, error: "parsed JSON is not an object" };
  }
  const obj = parsed as Record<string, unknown>;

  const severity = asEnum(obj.severity, SEVERITIES);
  if (!severity) return { ok: false, error: `severity must be one of: ${SEVERITIES.join(", ")}` };

  const confidence = asConfidence(obj.confidence);
  if (confidence === undefined) return { ok: false, error: "confidence must be a number 0..1" };

  const affectedUsers = asEnum(obj.affected_users, AFFECTED_USERS);
  if (!affectedUsers) {
    return { ok: false, error: `affected_users must be one of: ${AFFECTED_USERS.join(", ")}` };
  }

  const complexity = asEnum(obj.complexity, COMPLEXITIES);
  if (!complexity) {
    return { ok: false, error: `complexity must be one of: ${COMPLEXITIES.join(", ")}` };
  }

  const relevantFiles = asFileList(obj.relevant_files);
  if (!relevantFiles) return { ok: false, error: "relevant_files must be an array of strings" };

  const textFields = {
    reproduction: asNonEmptyString(obj.reproduction),
    suspected_root_cause: asNonEmptyString(obj.suspected_root_cause),
    evidence: asNonEmptyString(obj.evidence),
    proposed_fix: asNonEmptyString(obj.proposed_fix),
  };
  for (const [field, value] of Object.entries(textFields)) {
    if (!value) return { ok: false, error: `${field} must be a non-empty string` };
  }

  return {
    ok: true,
    value: {
      severity,
      confidence,
      affected_users: affectedUsers,
      reproduction: textFields.reproduction!,
      suspected_root_cause: textFields.suspected_root_cause!,
      relevant_files: relevantFiles,
      complexity,
      evidence: textFields.evidence!,
      proposed_fix: textFields.proposed_fix!,
    },
  };
}

/** Extract and validate a TriageAssessment from free-form agent output. */
export function extractAssessment(text: string | undefined): ExtractResult {
  if (!text || !text.trim()) return { ok: false, error: "agent returned empty output" };

  let lastError = "no JSON object found in output";
  for (const candidate of jsonCandidates(text)) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(candidate);
    } catch (err) {
      lastError = `JSON.parse failed: ${err instanceof Error ? err.message : String(err)}`;
      continue;
    }
    const result = validate(parsed);
    if (result.ok) return result;
    lastError = result.error;
  }
  return { ok: false, error: lastError };
}
