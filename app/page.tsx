"use client";

import { useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DeckSizePicker } from "@/components/DeckSizePicker";
import { ThemePicker } from "@/components/ThemePicker";
import { formatMs } from "@/components/palace/Hud";
import { EMPTY_HISTORY, loadHistory, type RunRecord } from "@/lib/storage";
import { useGameStore } from "@/store/gameStore";

const noopSubscribe = () => () => {};

export default function HomePage() {
	const router = useRouter();
	const {
		assignments,
		hydrated,
		hydrate,
		shuffle,
		themeId,
		setThemeId,
		colorThemeId,
		setColorThemeId,
	} = useGameStore();
	const history = useSyncExternalStore(
		noopSubscribe,
		loadHistory,
		() => EMPTY_HISTORY,
	);

	useEffect(() => {
		hydrate();
	}, [hydrate]);

	const assignedCount = Object.keys(assignments).length;
	const best = bestRuns(history);

	return (
		<main className="relative mx-auto flex min-h-dvh max-w-4xl flex-col px-6 py-14 text-[var(--mp-heading)]">
			{/* full-bleed themed background (scoped to this page) */}
			<div
				aria-hidden
				className="fixed inset-0 -z-10"
				style={{
					background:
						"linear-gradient(to bottom, var(--mp-page-from), var(--mp-page-via), var(--mp-page-to))",
				}}
			/>
			<header className="mb-12 text-center">
				<h1 className="text-5xl font-bold tracking-tight text-[var(--mp-heading)]">
					Memory Palace
				</h1>
				<p className="mx-auto mt-4 max-w-xl text-[var(--mp-body)]">
					Memorize a shuffled deck of cards the way memory athletes do: give
					every card a vivid image, then walk a familiar route and place each
					image at each stop. Recall is just walking the route again.
				</p>
			</header>

			<div className="grid gap-4 sm:grid-cols-2">
				{/* deck setup */}
				<Link
					href="/deck"
					className="group rounded-2xl border border-[var(--mp-card-border)] bg-[var(--mp-card-bg)] p-6 shadow-sm transition hover:border-[var(--mp-card-hover-border)] hover:shadow-md"
				>
					<div className="text-sm font-semibold uppercase tracking-wide text-[var(--mp-label)]">
						Step 1
					</div>
					<h2 className="mt-1 text-xl font-bold text-[var(--mp-heading)] group-hover:text-[var(--mp-link-hover)]">
						Build your deck →
					</h2>
					<p className="mt-2 text-sm text-[var(--mp-body)]">
						Assign a personal photo to each playing card.
					</p>
					<div className="mt-4 text-3xl font-bold text-[var(--mp-heading)]">
						{hydrated ? `${assignedCount} / 52` : "…"}
						<span className="ml-2 text-sm font-normal text-[var(--mp-muted)]">
							assigned
						</span>
					</div>
				</Link>

				{/* start walk */}
				<div className="rounded-2xl border border-[var(--mp-card-border)] bg-[var(--mp-card-bg)] p-6 shadow-sm">
					<div className="text-sm font-semibold uppercase tracking-wide text-[var(--mp-label)]">
						Step 2
					</div>
					<h2 className="mt-1 text-xl font-bold text-[var(--mp-heading)]">
						Shuffle & walk
					</h2>
					<p className="mt-2 text-sm text-[var(--mp-body)]">
						Pick a map and color theme, shuffle the deck, then walk and memorize
						the order.
					</p>
					<div className="mt-4 space-y-4">
						<ThemePicker
							themeId={themeId}
							onThemeChange={setThemeId}
							colorThemeId={colorThemeId}
							onColorThemeChange={setColorThemeId}
						/>
						{hydrated && assignedCount < 10 ? (
							<p className="text-sm text-[var(--mp-muted)]">
								Assign at least 10 photos to start.
							</p>
						) : (
							<DeckSizePicker
								assignedCount={assignedCount}
								onPick={size => {
									shuffle(size);
									router.push("/palace");
								}}
							/>
						)}
					</div>
				</div>
			</div>

			{/* support portal */}
			<div className="mt-4 grid gap-3 sm:grid-cols-2">
				<Link
					href="/support"
					className="group flex items-center justify-between rounded-2xl border border-[var(--mp-card-border)] bg-[var(--mp-card-bg)] px-6 py-4 shadow-sm transition hover:border-[var(--mp-card-hover-border)] hover:shadow-md"
				>
					<div>
						<h2 className="text-base font-bold text-[var(--mp-heading)] group-hover:text-[var(--mp-link-hover)]">
							Support
						</h2>
						<p className="mt-0.5 text-sm text-[var(--mp-body)]">
							Report a bug, incident, or feature request.
						</p>
					</div>
					<span className="text-xl font-bold text-[var(--mp-heading)]">→</span>
				</Link>
				<Link
					href="/support/board"
					className="group flex items-center justify-between rounded-2xl border border-[var(--mp-card-border)] bg-[var(--mp-card-bg)] px-6 py-4 shadow-sm transition hover:border-[var(--mp-card-hover-border)] hover:shadow-md"
				>
					<div>
						<h2 className="text-base font-bold text-[var(--mp-heading)] group-hover:text-[var(--mp-link-hover)]">
							Pipeline board
						</h2>
						<p className="mt-0.5 text-sm text-[var(--mp-body)]">
							Live open requests and activity.
						</p>
					</div>
					<span className="text-xl font-bold text-[var(--mp-heading)]">→</span>
				</Link>
			</div>

			{/* history */}
			<section className="mt-10">
				<h2 className="mb-3 text-lg font-bold text-[var(--mp-heading)]">
					Your runs
				</h2>
				{history.length === 0 ? (
					<p className="rounded-xl border border-[var(--mp-card-border)] bg-[var(--mp-card-bg)] p-6 text-center text-sm text-[var(--mp-muted)]">
						No completed runs yet. Walk the palace, then enter game mode.
					</p>
				) : (
					<>
						{best.length > 0 && (
							<div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
								{best.map(b => (
									<div
										key={`${b.deckSize}-${b.mode}`}
										className="rounded-xl border border-[var(--mp-best-border)] bg-[var(--mp-best-bg)] p-4 text-center shadow-sm"
									>
										<div className="text-xs text-[var(--mp-best-label)]">
											Best · {b.deckSize} cards · {b.mode}
										</div>
										<div className="mt-1 text-xl font-bold font-mono text-[var(--mp-heading)]">
											{formatMs(b.timeMs)}
										</div>
										<div className="text-xs text-[var(--mp-muted)]">
											{b.correct}/{b.total} correct
										</div>
									</div>
								))}
							</div>
						)}
						<ul className="space-y-1.5">
							{history.slice(0, 10).map((run, i) => (
								<li
									key={i}
									className="flex items-center justify-between rounded-lg border border-[var(--mp-card-border)] bg-[var(--mp-card-bg)] px-4 py-2.5 text-sm shadow-sm"
								>
									<span className="text-[var(--mp-body)]">
										{new Date(run.ts).toLocaleDateString()}{" "}
										<span className="text-[var(--mp-muted)]">
											{new Date(run.ts).toLocaleTimeString([], {
												hour: "numeric",
												minute: "2-digit",
											})}
										</span>
									</span>
									<span className="text-[var(--mp-body)]">
										{run.deckSize} cards · {run.mode}
									</span>
									<span
										className={
											run.correct === run.total
												? "font-semibold text-[var(--mp-link-hover)]"
												: "text-[var(--mp-heading)]"
										}
									>
										{run.correct}/{run.total}
									</span>
									<span className="font-mono text-[var(--mp-heading)]">
										{formatMs(run.timeMs)}
									</span>
								</li>
							))}
						</ul>
					</>
				)}
			</section>

			<footer className="mt-auto pt-12 text-center text-xs text-[var(--mp-muted)]">
				Based on the method of loci — see{" "}
				<span className="italic">Moonwalking with Einstein</span>. Everything is
				stored locally in your browser.
			</footer>
		</main>
	);
}

/** Best (fastest perfect-or-highest-accuracy) run per deckSize+mode combo. */
function bestRuns(history: RunRecord[]): RunRecord[] {
	const byKey = new Map<string, RunRecord>();
	for (const run of history) {
		const key = `${run.deckSize}-${run.mode}`;
		const current = byKey.get(key);
		if (
			!current ||
			run.correct > current.correct ||
			(run.correct === current.correct && run.timeMs < current.timeMs)
		) {
			byKey.set(key, run);
		}
	}
	return [...byKey.values()].sort((a, b) => a.deckSize - b.deckSize);
}
