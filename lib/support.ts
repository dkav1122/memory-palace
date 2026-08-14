/**
 * Client for the workflow orchestrator's intake API (see orchestrator/src/routes.ts).
 * Types are duplicated here on purpose: the orchestrator is a separate package
 * and the portal must not import from its source tree.
 */

export type SupportRequestType = "bug" | "incident" | "feature";

export type TicketStatus =
	| "submitted"
	| "triaging"
	| "triaged"
	| "ready"
	| "executing"
	| "pr_ready"
	| "rejected"
	| "failed";

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
		score: number | null;
		scoreExplanation: string | null;
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

export interface BoardItem {
	requestId: string;
	type: SupportRequestType;
	title: string;
	source: string;
	status: TicketStatus;
	score: number | null;
	scoreExplanation: string | null;
	jiraIssueKey: string | null;
	jiraUrl: string | null;
	prUrl: string | null;
	attempts: number;
	createdAt: string;
	updatedAt: string;
}

export interface BoardResponse {
	wipLimit: number;
	inFlight: number;
	slotsOpen: number;
	counts: Record<string, number>;
	items: BoardItem[];
}

export interface ActivityEvent {
	id: number;
	requestId: string;
	kind: string;
	message: string;
	createdAt: string;
	title: string;
	type: SupportRequestType;
}

export interface ActivityResponse {
	events: ActivityEvent[];
}

const ORCH_URL = (
	process.env.NEXT_PUBLIC_ORCH_URL ?? "http://localhost:4100"
).replace(/\/$/, "");

/** 13–19 digit sequences with optional separators (common PAN shapes). */
const PAN_PATTERN = /\b(?:\d[ -]?){13,18}\d\b/;

/** CVV/CVC values often pasted next to a label. */
const CVV_LABEL_PATTERN =
	/\b(?:cvv|cvc|cid|security code)[:\s#]*\d{3,4}\b/i;

export const SENSITIVE_DATA_MESSAGE =
	"Do not include credit card numbers, CVV codes, or other financial information. Memory Palace does not accept or process payments.";

export function containsSensitiveFinancialData(text: string): boolean {
	return PAN_PATTERN.test(text) || CVV_LABEL_PATTERN.test(text);
}

async function parseError(res: Response): Promise<string> {
	const data = (await res.json().catch(() => null)) as { error?: string } | null;
	return data?.error ?? `Request failed (HTTP ${res.status})`;
}

/** True when fetch failed because the orchestrator is unreachable. */
export function isOrchestratorUnreachable(err: unknown): boolean {
	if (!(err instanceof Error)) return false;
	const msg = err.message.toLowerCase();
	return (
		err.name === "TypeError" ||
		msg.includes("failed to fetch") ||
		msg.includes("networkerror") ||
		msg.includes("load failed") ||
		msg.includes("fetch failed")
	);
}

function orchUnreachableError(): Error {
	return new Error(
		"Orchestrator is unreachable — start it on port 4100 (cd orchestrator && npm run dev).",
	);
}

export async function submitRequest(
	input: SubmitRequestInput,
): Promise<SubmitRequestResponse> {
	let res: Response;
	try {
		res = await fetch(`${ORCH_URL}/api/requests`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(input),
		});
	} catch (err) {
		if (isOrchestratorUnreachable(err)) throw orchUnreachableError();
		throw err;
	}
	if (!res.ok) throw new Error(await parseError(res));
	return res.json();
}

/** Returns null for unknown ids (404). */
export async function getRequestTimeline(
	id: string,
): Promise<RequestTimeline | null> {
	let res: Response;
	try {
		res = await fetch(`${ORCH_URL}/api/requests/${encodeURIComponent(id)}`);
	} catch (err) {
		if (isOrchestratorUnreachable(err)) throw orchUnreachableError();
		throw err;
	}
	if (res.status === 404) return null;
	if (!res.ok) throw new Error(await parseError(res));
	return res.json();
}

export async function getBoard(includeTerminal = false): Promise<BoardResponse> {
	const qs = includeTerminal ? "?includeTerminal=1" : "";
	let res: Response;
	try {
		res = await fetch(`${ORCH_URL}/api/requests${qs}`);
	} catch (err) {
		if (isOrchestratorUnreachable(err)) throw orchUnreachableError();
		throw err;
	}
	if (!res.ok) throw new Error(await parseError(res));
	return res.json();
}

export async function getActivity(limit = 50): Promise<ActivityResponse> {
	let res: Response;
	try {
		res = await fetch(
			`${ORCH_URL}/api/events?limit=${encodeURIComponent(String(limit))}`,
		);
	} catch (err) {
		if (isOrchestratorUnreachable(err)) throw orchUnreachableError();
		throw err;
	}
	if (!res.ok) throw new Error(await parseError(res));
	return res.json();
}
