"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getRequestTimeline, type RequestTimeline } from "@/lib/support";

const POLL_MS = 4000;

const STATUS_LABELS: Record<string, string> = {
	submitted: "Submitted — awaiting triage",
	triaging: "Triage in progress",
	triaged: "Triaged",
	ready: "Ready for execution",
	executing: "Execution in progress",
	pr_ready: "PR ready for human review",
	rejected: "Rejected",
	failed: "Failed",
};

/** SQLite datetime('now') is UTC as "YYYY-MM-DD HH:MM:SS" — normalize to ISO. */
function formatUtc(sqliteTs: string): string {
	return new Date(`${sqliteTs.replace(" ", "T")}Z`).toLocaleString();
}

export default function SupportRequestPage() {
	const { id } = useParams<{ id: string }>();
	const [timeline, setTimeline] = useState<RequestTimeline | null>(null);
	const [notFound, setNotFound] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;

		async function poll() {
			try {
				const data = await getRequestTimeline(id);
				if (cancelled) return;
				if (data === null) {
					setNotFound(true);
				} else {
					setTimeline(data);
					setNotFound(false);
				}
				setError(null);
			} catch (err) {
				if (!cancelled) {
					setError(err instanceof Error ? err.message : "Failed to load");
				}
			}
		}

		poll();
		const timer = setInterval(poll, POLL_MS);
		return () => {
			cancelled = true;
			clearInterval(timer);
		};
	}, [id]);

	return (
		<main className="relative mx-auto flex min-h-dvh max-w-2xl flex-col px-6 py-14 text-slate-900">
			<div
				aria-hidden
				className="fixed inset-0 -z-10 bg-gradient-to-b from-sky-50 via-sky-100 to-sky-200"
			/>
			<Link
				href="/support"
				className="text-sm text-slate-500 hover:text-slate-700"
			>
				← Back to support
			</Link>

			{notFound ? (
				<div className="mt-8 rounded-2xl border border-sky-200 bg-white/70 p-8 text-center shadow-sm">
					<h1 className="text-2xl font-bold text-sky-950">
						Request not found
					</h1>
					<p className="mt-2 text-sm text-slate-600">
						We couldn&apos;t find a request with this id. It may have been
						removed, or the link is wrong.
					</p>
				</div>
			) : !timeline ? (
				<p className="mt-8 rounded-2xl border border-sky-200 bg-white/70 p-8 text-center text-sm text-slate-500 shadow-sm">
					{error ?? "Loading request…"}
				</p>
			) : (
				<>
					<header className="mt-2 mb-6">
						<div className="flex items-center gap-2">
							<span className="rounded-full border border-sky-300 bg-white/80 px-2.5 py-0.5 font-mono text-xs font-semibold text-sky-800">
								@{timeline.request.type}
							</span>
							<span className="text-xs text-slate-500">
								submitted {formatUtc(timeline.request.createdAt)}
							</span>
						</div>
						<h1 className="mt-2 text-3xl font-bold tracking-tight text-sky-950">
							{timeline.request.title}
						</h1>
					</header>

					<div className="rounded-2xl border border-sky-200 bg-white/70 p-6 shadow-sm">
						<div className="flex flex-wrap items-center justify-between gap-3">
							<div>
								<div className="text-sm font-semibold uppercase tracking-wide text-sky-700">
									Status
								</div>
								<div className="mt-1 text-lg font-bold text-sky-950">
									{STATUS_LABELS[timeline.ticket.status] ??
										timeline.ticket.status}
								</div>
							</div>
							{timeline.ticket.jiraUrl && (
								<a
									href={timeline.ticket.jiraUrl}
									target="_blank"
									rel="noreferrer"
									className="rounded-lg border border-sky-200 bg-white px-3 py-1.5 text-sm font-semibold text-sky-800 transition hover:border-sky-400"
								>
									{timeline.ticket.jiraIssueKey} in Jira ↗
								</a>
							)}
						</div>
					</div>

					<section className="mt-6 rounded-2xl border border-sky-200 bg-white/70 p-6 shadow-sm">
						<h2 className="text-sm font-semibold uppercase tracking-wide text-sky-700">
							Timeline
						</h2>
						<ol className="mt-3 space-y-3">
							{timeline.events.map(event => (
								<li key={event.id} className="flex gap-3">
									<span
										aria-hidden
										className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
											event.kind === "error"
												? "bg-red-400"
												: "bg-emerald-500"
										}`}
									/>
									<div>
										<div className="text-sm text-slate-800">
											{event.message}
										</div>
										<div className="text-xs text-slate-400">
											{formatUtc(event.createdAt)}
										</div>
									</div>
								</li>
							))}
						</ol>
						<p className="mt-4 text-xs text-slate-400">
							Updates automatically every few seconds.
						</p>
					</section>

					<section className="mt-6 rounded-2xl border border-sky-200 bg-white/70 p-6 shadow-sm">
						<h2 className="text-sm font-semibold uppercase tracking-wide text-sky-700">
							Your report
						</h2>
						<p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
							{timeline.request.rawSubmission}
						</p>
					</section>

					{error && (
						<p className="mt-4 text-xs text-red-600">
							Live updates interrupted: {error}
						</p>
					)}
				</>
			)}
		</main>
	);
}
