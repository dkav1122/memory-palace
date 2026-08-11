import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";
import type { Hono } from "hono";
import {
  addEvent,
  createRequestWithTicket,
  getRequest,
  getTicket,
  listEvents,
  setTicketJiraKey,
} from "./db.js";
import type { JiraClient } from "./jira.js";
import type { RequestSource, RequestType, WorkflowConfig } from "./types.js";

const REQUEST_TYPES: RequestType[] = ["bug", "incident", "feature"];
const REQUEST_SOURCES: RequestSource[] = ["portal", "reddit"];
const TITLE_MAX = 200;
const DESCRIPTION_MAX = 5000;

interface IntakeBody {
  type: RequestType;
  title: string;
  description: string;
  submitterName?: string;
  submitterContact?: string;
  source?: RequestSource;
  sourceRef?: string;
}

function validateIntake(body: unknown): { ok: true; value: IntakeBody } | { ok: false; error: string } {
  if (typeof body !== "object" || body === null) return { ok: false, error: "Body must be a JSON object" };
  const b = body as Record<string, unknown>;
  if (!REQUEST_TYPES.includes(b.type as RequestType)) {
    return { ok: false, error: `type must be one of: ${REQUEST_TYPES.join(", ")}` };
  }
  if (typeof b.title !== "string" || !b.title.trim() || b.title.trim().length > TITLE_MAX) {
    return { ok: false, error: `title is required (1–${TITLE_MAX} chars)` };
  }
  if (
    typeof b.description !== "string" ||
    !b.description.trim() ||
    b.description.length > DESCRIPTION_MAX
  ) {
    return { ok: false, error: `description is required (1–${DESCRIPTION_MAX} chars)` };
  }
  const source = (b.source ?? "portal") as RequestSource;
  if (!REQUEST_SOURCES.includes(source)) {
    return { ok: false, error: `source must be one of: ${REQUEST_SOURCES.join(", ")}` };
  }
  for (const field of ["submitterName", "submitterContact", "sourceRef"] as const) {
    if (b[field] !== undefined && typeof b[field] !== "string") {
      return { ok: false, error: `${field} must be a string` };
    }
  }
  return {
    ok: true,
    value: {
      type: b.type as RequestType,
      title: (b.title as string).trim(),
      description: b.description as string,
      submitterName: (b.submitterName as string | undefined)?.trim() || undefined,
      submitterContact: (b.submitterContact as string | undefined)?.trim() || undefined,
      source,
      sourceRef: (b.sourceRef as string | undefined) || undefined,
    },
  };
}

export interface RouteDeps {
  db: Database.Database;
  config: WorkflowConfig;
  jira: JiraClient;
}

export function registerRoutes(app: Hono, { db, config, jira }: RouteDeps): void {
  app.post("/api/requests", async (c) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Invalid JSON body" }, 400);
    }
    const parsed = validateIntake(body);
    if (!parsed.ok) return c.json({ error: parsed.error }, 400);
    const input = parsed.value;

    const id = randomUUID();
    createRequestWithTicket(db, {
      id,
      type: input.type,
      title: input.title,
      rawSubmission: input.description,
      submitterName: input.submitterName ?? null,
      submitterContact: input.submitterContact ?? null,
      source: input.source ?? "portal",
      sourceRef: input.sourceRef ?? null,
    });

    // Jira mirror: the request row above is the source of truth and survives a Jira outage.
    let jiraResult: { key: string; url: string } | null = null;
    try {
      const submitter = input.submitterName
        ? `${input.submitterName}${input.submitterContact ? ` (${input.submitterContact})` : ""}`
        : "anonymous";
      const created = await jira.createIssue({
        summary: `[${input.type}] ${input.title}`,
        description: `${input.description}\n\nSubmitted by: ${submitter} | Source: ${input.source} | Request ID: ${id}`,
        labels: ["intake", input.type, `source-${input.source}`],
      });
      setTicketJiraKey(db, id, created.key);
      addEvent(
        db,
        id,
        "jira_created",
        `Jira ticket ${created.key} created in New / Awaiting Triage`,
        { key: created.key, url: created.url },
      );
      jiraResult = { key: created.key, url: created.url };
    } catch (error) {
      console.error(`[intake] Jira create failed for request ${id}:`, error);
      addEvent(db, id, "error", "Jira sync failed — will be retried", {
        detail: String(error),
      });
    }

    const request = getRequest(db, id)!;
    return c.json(
      { id, status: "submitted", jira: jiraResult, createdAt: request.created_at },
      201,
    );
  });

  app.get("/api/requests/:id", (c) => {
    const id = c.req.param("id");
    const request = getRequest(db, id);
    const ticket = getTicket(db, id);
    if (!request || !ticket) return c.json({ error: "Request not found" }, 404);

    const jiraBase = config.jira.baseUrl.replace(/\/$/, "");
    return c.json({
      request: {
        id: request.id,
        type: request.type,
        title: request.title,
        rawSubmission: request.raw_submission,
        submitterName: request.submitter_name,
        submitterContact: request.submitter_contact,
        source: request.source,
        sourceRef: request.source_ref,
        createdAt: request.created_at,
      },
      ticket: {
        status: ticket.status,
        jiraIssueKey: ticket.jira_issue_key,
        jiraUrl: ticket.jira_issue_key ? `${jiraBase}/browse/${ticket.jira_issue_key}` : null,
        updatedAt: ticket.updated_at,
      },
      events: listEvents(db, id).map((e) => ({
        id: e.id,
        kind: e.kind,
        message: e.message,
        createdAt: e.created_at,
      })),
    });
  });
}
