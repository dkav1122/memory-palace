"use client";

import { useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CardChip } from "@/components/CardChip";
import { QuizOverlay } from "@/components/game/QuizOverlay";
import { formatMs, HudPill, Timer } from "@/components/palace/Hud";
import { PalaceScene } from "@/components/palace/PalaceScene";
import { SceneLoader } from "@/components/palace/SceneLoader";
import { cardFullName } from "@/lib/cards";
import { useGameStore } from "@/store/gameStore";

export default function GamePage() {
	const router = useRouter();
	const {
		assignments,
		hydrated,
		hydrate,
		order,
		index,
		setIndex,
		quizMode,
		quizStartedAt,
		quizFinishedAt,
		answers,
		startQuiz,
		answer,
		shuffle,
		deckSize,
	} = useGameStore();

	useEffect(() => {
		hydrate();
	}, [hydrate]);

	const advance = useCallback(() => {
		const state = useGameStore.getState();
		if (state.index < state.order.length - 1) {
			state.setIndex(state.index + 1);
		}
	}, []);

	if (!hydrated) {
		return (
			<div className="flex h-dvh items-center justify-center text-zinc-500">
				Loading…
			</div>
		);
	}

	const orderValid =
		order.length > 0 && order.every(cardId => assignments[cardId]);

	if (!orderValid) {
		return (
			<div className="flex h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
				<h1 className="text-2xl font-bold">Nothing to test yet</h1>
				<p className="max-w-md text-zinc-400">
					Shuffle a deck and walk the palace first — then come back to test
					your memory.
				</p>
				<Link
					href="/palace"
					className="rounded-lg bg-emerald-600 px-5 py-2.5 font-semibold text-white hover:bg-emerald-500"
				>
					Go to the walk
				</Link>
			</div>
		);
	}

	const quizActive = quizStartedAt !== null;
	const done =
		quizActive && Object.keys(answers).length === order.length;

	const billboards = order.map((cardId, i) => ({
		cardId,
		url: assignments[cardId].url,
		revealed: !quizActive || !!answers[i],
	}));

	const correctCount = Object.values(answers).filter(a => a.correct).length;

	return (
		<div className="relative h-dvh w-full overflow-hidden">
			<PalaceScene billboards={billboards} index={index} />
			<SceneLoader />

			{/* top bar */}
			<div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-4">
				<div className="flex flex-col gap-2">
					<HudPill>
						<Link href="/palace" className="hover:underline">
							← Back to walk
						</Link>
					</HudPill>
					{quizActive && (
						<HudPill>
							{Math.min(index + 1, order.length)} / {order.length}
						</HudPill>
					)}
				</div>
				{quizActive && !done && (
					<HudPill>
						<Timer startedAt={quizStartedAt} />
					</HudPill>
				)}
			</div>

			{/* mode picker */}
			{!quizActive && (
				<div className="absolute inset-0 flex items-center justify-center bg-black/60 p-6">
					<div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-8 text-center">
						<h1 className="text-2xl font-bold">Game mode</h1>
						<p className="mt-2 text-sm text-zinc-400">
							Walk the route in order. At each stop, pick what belongs there
							from 4 choices. Scored on accuracy and time.
						</p>
						<div className="mt-6 grid grid-cols-2 gap-3">
							<button
								onClick={() => startQuiz("easy")}
								className="rounded-xl border border-emerald-700 bg-emerald-950/50 px-4 py-5 hover:bg-emerald-900/50"
							>
								<div className="text-lg font-bold text-emerald-400">Easy</div>
								<div className="mt-1 text-xs text-zinc-400">
									Pick the image
								</div>
							</button>
							<button
								onClick={() => startQuiz("hard")}
								className="rounded-xl border border-indigo-700 bg-indigo-950/50 px-4 py-5 hover:bg-indigo-900/50"
							>
								<div className="text-lg font-bold text-indigo-400">Hard</div>
								<div className="mt-1 text-xs text-zinc-400">
									Pick the card
								</div>
							</button>
						</div>
					</div>
				</div>
			)}

			{/* quiz panel */}
			{quizActive && !done && (
				<div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-4">
					<QuizOverlay
						order={order}
						index={index}
						mode={quizMode}
						assignments={assignments}
						answer={answers[index]}
						onAnswer={answer}
						onAdvance={advance}
					/>
				</div>
			)}

			{/* results */}
			{done && quizFinishedAt && quizStartedAt && (
				<div className="absolute inset-0 flex items-center justify-center bg-black/70 p-6">
					<div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-950 p-8">
						<h1 className="text-center text-2xl font-bold">
							{correctCount === order.length ? "Perfect run!" : "Run complete"}
						</h1>
						<div className="mt-6 grid grid-cols-2 gap-3 text-center">
							<div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
								<div className="text-3xl font-bold">
									{correctCount}/{order.length}
								</div>
								<div className="text-xs text-zinc-500">correct</div>
							</div>
							<div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
								<div className="text-3xl font-bold font-mono">
									{formatMs(quizFinishedAt - quizStartedAt)}
								</div>
								<div className="text-xs text-zinc-500">
									{quizMode} · {order.length} cards
								</div>
							</div>
						</div>

						{correctCount < order.length && (
							<div className="mt-5">
								<div className="mb-2 text-sm font-semibold text-zinc-300">
									Review your misses
								</div>
								<ul className="space-y-2">
									{order.map((cardId, i) =>
										answers[i]?.correct ? null : (
											<li
												key={i}
												className="flex items-center gap-3 rounded-lg border border-red-950 bg-red-950/20 p-2 text-sm"
											>
												<span className="w-8 text-center text-xs text-zinc-500">
													#{i + 1}
												</span>
												<CardChip cardId={cardId} size="sm" />
												{/* eslint-disable-next-line @next/next/no-img-element */}
												<img
													src={assignments[cardId].url}
													alt=""
													className="h-9 w-9 rounded object-cover"
												/>
												<span className="min-w-0">
													<span className="block truncate">
														{assignments[cardId].name}
													</span>
													<span className="block text-xs text-zinc-500">
														{cardFullName(cardId)}
													</span>
												</span>
											</li>
										),
									)}
								</ul>
							</div>
						)}

						<div className="mt-6 flex flex-col gap-2">
							<button
								onClick={() => {
									shuffle(deckSize);
									router.push("/palace");
								}}
								className="rounded-lg bg-emerald-600 px-4 py-2.5 font-semibold text-white hover:bg-emerald-500"
							>
								New shuffle → memorize again
							</button>
							<button
								onClick={() => {
									setIndex(0);
									startQuiz(quizMode);
								}}
								className="rounded-lg border border-zinc-700 px-4 py-2.5 text-zinc-200 hover:bg-zinc-900"
							>
								Retry this deck
							</button>
							<Link
								href="/"
								className="rounded-lg border border-zinc-800 px-4 py-2.5 text-center text-zinc-400 hover:bg-zinc-900"
							>
								Home
							</Link>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
