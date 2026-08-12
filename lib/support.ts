/**
 * Client for the workflow orchestrator's intake API (see orchestrator/src/routes.ts).
 * Types are duplicated here on purpose: the orchestrator is a separate package
 * and the portal must not import from its source tree.
 */

export type SupportRequestType = "bug" | "incident" | "feature";

export interface SubmitRequestInput {
	type: SupportRequestType;
	title: string;
	description: string;
	submitterName?: string;
	submitterContact?: string;
}

export interface SubmitRequestResponse {
	id: string;
	status: string;
	jira: { key: string; url: string } | null;
	createdAt: string;
}

export interface RequestTimeline {
	request: {
		id: string;
		type: SupportRequestType;
		title: string;
		rawSubmission: string;
		submitterName: string | null;
		submitterContact: string | null;
		source: string;
		sourceRef: string | null;
		createdAt: string;
	};
	ticket: {
		status: string;
		jiraIssueKey: string | null;
		jiraUrl: string | null;
		prUrl: string | null;
		updatedAt: string;
	};
	events: Array<{
		id: number;
		kind: string;
		message: string;
		createdAt: string;
	}>;
}

const ORCH_URL = (
	process.env.NEXT_PUBLIC_ORCH_URL ?? "http://localhost:4100"
).replace(/\/$/, "");

async function parseError(res: Response): Promise<string> {
	const data = (await res.json().catch(() => null)) as { error?: string } | null;
	return data?.error ?? `Request failed (HTTP ${res.status})`;
}

export async function submitRequest(
	input: SubmitRequestInput,
): Promise<SubmitRequestResponse> {
	const res = await fetch(`${ORCH_URL}/api/requests`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(input),
	});
	if (!res.ok) throw new Error(await parseError(res));
	return res.json();
}

/** Returns null for unknown ids (404). */
export async function getRequestTimeline(
	id: string,
): Promise<RequestTimeline | null> {
	const res = await fetch(`${ORCH_URL}/api/requests/${encodeURIComponent(id)}`);
	if (res.status === 404) return null;
	if (!res.ok) throw new Error(await parseError(res));
	return res.json();
}
