"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
	getActivity,
	getBoard,
	type ActivityEvent,
	type BoardItem,
	type BoardResponse,
	type TicketStatus,
} from "@/lib/support";

const POLL_MS = 2500;

const STATUS_LABELS: Record<TicketStatus, string> = {
	submitted: "Awaiting triage",
	triaging: "Triage in progress",
	triaged: "Triaged",
	ready: "Ready for execution",
	executing: "Execution in progress",
	pr_ready: "PR ready",
	rejected: "Rejected",
	failed: "Failed",
};

const OPEN_STATUS_ORDER: TicketStatus[] = [
	"submitted",
	"triaging",
	"triaged",
	"ready",
	"executing",
];

const STATUS_BADGE: Record<TicketStatus, string> = {
	submitted: "border-sky-300 bg-sky-50 text-sky-800",
	triaging: "border-amber-300 bg-amber-50 text-amber-900",
	triaged: "border-violet-300 bg-violet-50 text-violet-900",
	ready: "border-emerald-300 bg-emerald-50 text-emerald-900",
	executing: "border-orange-300 bg-orange-50 text-orange-900",
	pr_ready: "border-emerald-400 bg-emerald-100 text-emerald-950",
	rejected: "border-slate-300 bg-slate-100 text-slate-700",
	failed: "border-red-300 bg-red-50 text-red-800",
};

/** SQLite datetime('now') is UTC as "YYYY-MM-DD HH:MM:SS" — normalize to ISO. */
function parseUtc(sqliteTs: string): Date {
	return new Date(`${sqliteTs.replace(" ", "T")}Z`);
}

function formatUtc(sqliteTs: string): string {
	return parseUtc(sqliteTs).toLocaleString();
}

function formatRelative(sqliteTs: string, nowMs: number): string {
	const then = parseUtc(sqliteTs).getTime();
	const sec = Math.max(0, Math.round((nowMs - then) / 1000));
	if (sec < 60) return `${sec}s ago`;
	const min = Math.round(sec / 60);
	if (min < 60) return `${min}m ago`;
	const hr = Math.round(min / 60);
	if (hr < 48) return `${hr}h ago`;
	return formatUtc(sqliteTs);
}

export default function SupportBoardPage() {
	const [includeTerminal, setIncludeTerminal] = useState(false);
	const [board, setBoard] = useState<BoardResponse | null>(null);
	const [events, setEvents] = useState<ActivityEvent[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [nowMs, setNowMs] = useState(() => Date.now());
	const prevStatusRef = useRef<Map<string, TicketStatus>>(new Map());
	const [flashed, setFlashed] = useState<Set<string>>(new Set());

	useEffect(() => {
		let cancelled = false;

		async function poll() {
			try {
				const [boardData, activity] = await Promise.all([
					getBoard(includeTerminal),
					getActivity(50),
				]);
				if (cancelled) return;

				const prev = prevStatusRef.current;
				const nextFlash = new Set<string>();
				for (const item of boardData.items) {
					const was = prev.get(item.requestId);
					if (was !== undefined && was !== item.status) {
						nextFlash.add(item.requestId);
					}
				}
				prevStatusRef.current = new Map(
					boardData.items.map(i => [i.requestId, i.status]),
				);

				setBoard(boardData);
				setEvents(activity.events);
				setNowMs(Date.now());
				setError(null);
				if (nextFlash.size > 0) {
					setFlashed(nextFlash);
					window.setTimeout(() => {
						if (!cancelled) setFlashed(new Set());
					}, 1600);
				}
			} catch (err) {
				if (!cancelled) {
					setError(err instanceof Error ? err.message : "Failed to load board");
				}
			}
		}

		poll();
		const timer = setInterval(poll, POLL_MS);
		return () => {
			cancelled = true;
			clearInterval(timer);
		};
	}, [includeTerminal]);

	return (
		<main className="relative mx-auto flex min-h-dvh max-w-6xl flex-col px-6 py-14 text-slate-900">
			<div
				aria-hidden
				className="fixed inset-0 -z-10 bg-gradient-to-b from-sky-50 via-sky-100 to-sky-200"
			/>
			<div className="flex flex-wrap items-center justify-between gap-3">
				<Link href="/support" className="text-sm text-slate-500 hover:text-slate-700">
					← Back to support
				</Link>
				<label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
					<input
						type="checkbox"
						checked={includeTerminal}
						onChange={e => setIncludeTerminal(e.target.checked)}
						className="rounded border-sky-300 text-emerald-600 focus:ring-emerald-500"
					/>
					Show completed (PR ready / failed)
				</label>
			</div>

			<header className="mt-2 mb-6">
				<h1 className="text-4xl font-bold tracking-tight text-sky-950">
					Pipeline board
				</h1>
				<p className="mt-2 text-slate-600">
					Live view of open requests and orchestrator activity. Updates every few
					seconds.
				</p>
			</header>

			{error && (
				<div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
					{error}
				</div>
			)}

			{board && (
				<section className="mb-6 rounded-2xl border border-sky-200 bg-white/70 p-5 shadow-sm">
					<div className="flex flex-wrap items-end justify-between gap-4">
						<div>
							<div className="text-sm font-semibold uppercase tracking-wide text-sky-700">
								Execution WIP
							</div>
							<div className="mt-1 text-2xl font-bold text-sky-950">
								{board.inFlight}
								<span className="text-lg font-semibold text-slate-400">
									{" "}
									/ {board.wipLimit}
								</span>
							</div>
							<p className="mt-0.5 text-xs text-slate-500">
								{board.slotsOpen === 0
									? "No free slots — backpressure holds tickets in Triaged"
									: `${board.slotsOpen} slot${board.slotsOpen === 1 ? "" : "s"} open`}
							</p>
						</div>
						<div className="flex flex-wrap gap-2">
							{OPEN_STATUS_ORDER.map(status => (
								<span
									key={status}
									className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_BADGE[status]}`}
								>
									{STATUS_LABELS[status]}{" "}
									<span className="font-mono">{board.counts[status] ?? 0}</span>
								</span>
							))}
						</div>
					</div>
				</section>
			)}

			<div className="grid gap-6 lg:grid-cols-5">
				<section className="lg:col-span-3 rounded-2xl border border-sky-200 bg-white/70 p-5 shadow-sm">
					<h2 className="text-sm font-semibold uppercase tracking-wide text-sky-700">
						Open requests
					</h2>
					{!board ? (
						<p className="mt-4 text-sm text-slate-500">Loading…</p>
					) : board.items.length === 0 ? (
						<p className="mt-4 text-sm text-slate-500">
							No {includeTerminal ? "" : "open "}requests right now. Submit one
							from{" "}
							<Link href="/support" className="font-semibold text-emerald-700 hover:underline">
								Support
							</Link>
							.
						</p>
					) : (
						<ul className="mt-3 divide-y divide-sky-100">
							{board.items.map(item => (
								<BoardRow
									key={item.requestId}
									item={item}
									nowMs={nowMs}
									flash={flashed.has(item.requestId)}
								/>
							))}
						</ul>
					)}
				</section>

				<section className="lg:col-span-2 rounded-2xl border border-sky-200 bg-white/70 p-5 shadow-sm">
					<h2 className="text-sm font-semibold uppercase tracking-wide text-sky-700">
						Live activity
					</h2>
					{events.length === 0 ? (
						<p className="mt-4 text-sm text-slate-500">No events yet.</p>
					) : (
						<ol className="mt-3 max-h-[70vh] space-y-3 overflow-y-auto pr-1">
							{events.map(event => (
								<li key={event.id} className="flex gap-3">
									<span
										aria-hidden
										className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
											event.kind === "error" ? "bg-red-400" : "bg-emerald-500"
										}`}
									/>
									<div className="min-w-0">
										<div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
											<span className="font-mono text-[11px] font-semibold text-sky-800">
												@{event.type}
											</span>
											<Link
												href={`/support/${event.requestId}`}
												className="truncate text-sm font-semibold text-sky-950 hover:text-emerald-700"
											>
												{event.title}
											</Link>
										</div>
										<p
											className={`mt-0.5 text-sm ${
												event.kind === "error" ? "text-red-700" : "text-slate-700"
											}`}
										>
											{event.message}
										</p>
										<p className="text-xs text-slate-400">
											{formatRelative(event.createdAt, nowMs)}
										</p>
									</div>
								</li>
							))}
						</ol>
					)}
				</section>
			</div>
		</main>
	);
}

function BoardRow({
	item,
	nowMs,
	flash,
}: {
	item: BoardItem;
	nowMs: number;
	flash: boolean;
}) {
	return (
		<li
			className={`py-3 transition-colors duration-700 ${
				flash ? "bg-emerald-50/80" : "bg-transparent"
			}`}
		>
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div className="min-w-0 flex-1">
					<div className="flex flex-wrap items-center gap-2">
						<span className="rounded-full border border-sky-300 bg-white/80 px-2 py-0.5 font-mono text-[11px] font-semibold text-sky-800">
							@{item.type}
						</span>
						<span
							className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${STATUS_BADGE[item.status]}`}
						>
							{STATUS_LABELS[item.status] ?? item.status}
						</span>
						{item.score !== null && (
							<span
								title={item.scoreExplanation ?? undefined}
								className="rounded-full border border-slate-200 bg-white px-2 py-0.5 font-mono text-[11px] text-slate-600"
							>
								score {Math.round(item.score)}
							</span>
						)}
					</div>
					<Link
						href={`/support/${item.requestId}`}
						className="mt-1 block truncate text-base font-semibold text-sky-950 hover:text-emerald-700"
					>
						{item.title}
					</Link>
					<p className="mt-0.5 text-xs text-slate-400">
						updated {formatRelative(item.updatedAt, nowMs)}
						{item.attempts > 0 ? ` · attempts ${item.attempts}` : ""}
						{item.source !== "portal" ? ` · via ${item.source}` : ""}
					</p>
				</div>
				<div className="flex shrink-0 flex-wrap items-center gap-2">
					{item.prUrl && (
						<a
							href={item.prUrl}
							target="_blank"
							rel="noreferrer"
							className="rounded-lg border border-emerald-300 bg-white px-2.5 py-1 text-xs font-semibold text-emerald-800 transition hover:border-emerald-500"
						>
							PR ↗
						</a>
					)}
					{item.jiraUrl && item.jiraIssueKey && (
						<a
							href={item.jiraUrl}
							target="_blank"
							rel="noreferrer"
							className="rounded-lg border border-sky-200 bg-white px-2.5 py-1 text-xs font-semibold text-sky-800 transition hover:border-sky-400"
						>
							{item.jiraIssueKey} ↗
						</a>
					)}
				</div>
			</div>
		</li>
	);
}
