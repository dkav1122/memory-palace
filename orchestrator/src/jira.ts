import type { InternalStatus, WorkflowConfig } from "./types.js";
import type { JiraCredentials } from "./config.js";

export interface JiraTransition {
  id: string;
  name: string;
  to: { id: string; name: string };
}

export interface CreatedIssue {
  key: string;
  id: string;
  url: string;
}

/** Minimal Atlassian Document Format body from plain text (paragraphs split on blank lines). */
function toAdf(text: string) {
  const paragraphs = text.split(/\n{2,}/).map((block) => ({
    type: "paragraph",
    content: [{ type: "text", text: block.trim() || " " }],
  }));
  return { type: "doc", version: 1, content: paragraphs };
}

export class JiraClient {
  private readonly baseUrl: string;
  private readonly authHeader: string;

  constructor(
    private readonly config: WorkflowConfig,
    credentials: JiraCredentials,
  ) {
    this.baseUrl = config.jira.baseUrl.replace(/\/$/, "");
    this.authHeader = `Basic ${Buffer.from(`${credentials.email}:${credentials.apiToken}`).toString("base64")}`;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}/rest/api/3${path}`, {
      method,
      headers: {
        Authorization: this.authHeader,
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Jira ${method} ${path} failed: ${res.status} ${res.statusText} ${detail}`);
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }

  async createIssue(input: { summary: string; description: string; labels?: string[] }): Promise<CreatedIssue> {
    const created = await this.request<{ id: string; key: string }>("POST", "/issue", {
      fields: {
        project: { key: this.config.jira.projectKey },
        issuetype: { name: this.config.jira.issueType },
        summary: input.summary,
        description: toAdf(input.description),
        ...(input.labels?.length ? { labels: input.labels } : {}),
      },
    });
    return { key: created.key, id: created.id, url: `${this.baseUrl}/browse/${created.key}` };
  }

  async addComment(issueKey: string, text: string): Promise<void> {
    await this.request("POST", `/issue/${issueKey}/comment`, { body: toAdf(text) });
  }

  async listTransitions(issueKey: string): Promise<JiraTransition[]> {
    const res = await this.request<{ transitions: JiraTransition[] }>(
      "GET",
      `/issue/${issueKey}/transitions`,
    );
    return res.transitions;
  }

  async getIssueStatus(issueKey: string): Promise<{ id: string; name: string }> {
    const res = await this.request<{ fields: { status: { id: string; name: string } } }>(
      "GET",
      `/issue/${issueKey}?fields=status`,
    );
    return res.fields.status;
  }

  /**
   * Move an issue to the Jira status mapped from an internal status.
   * Uses the transition ID cached in workflow.config.json; if that fails
   * (workflow edited since discovery), re-discovers by target status ID and
   * retries once. Transition *names* are never trusted — they can be stale.
   */
  async transitionToStatus(issueKey: string, internalStatus: InternalStatus): Promise<void> {
    const mapping = this.config.jira.statusMap[internalStatus];
    if (!mapping) {
      throw new Error(`No Jira status mapping for internal status "${internalStatus}"`);
    }
    try {
      await this.executeTransition(issueKey, mapping.transitionId);
    } catch (cachedError) {
      const transitions = await this.listTransitions(issueKey);
      const discovered = transitions.find((t) => t.to.id === mapping.statusId);
      if (!discovered) {
        throw new Error(
          `No transition to status "${mapping.jiraStatus}" (${mapping.statusId}) on ${issueKey}; ` +
            `cached transition ${mapping.transitionId} also failed: ${String(cachedError)}`,
        );
      }
      await this.executeTransition(issueKey, discovered.id);
    }
  }

  private async executeTransition(issueKey: string, transitionId: string): Promise<void> {
    await this.request("POST", `/issue/${issueKey}/transitions`, {
      transition: { id: transitionId },
    });
  }
}
