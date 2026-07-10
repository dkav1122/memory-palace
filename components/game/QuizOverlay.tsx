"use client";

import { useEffect, useMemo, useRef } from "react";
import { CardChip } from "@/components/CardChip";
import { cardFullName } from "@/lib/cards";
import { mulberry32, sample, shuffleArray } from "@/lib/rng";
import type { Assignment, QuizAnswer, QuizMode } from "@/store/gameStore";

/**
 * Builds the 4 answer choices for a waypoint. Seeded by position + correct
 * card so re-renders (and StrictMode double-invokes) keep choices stable
 * within a run.
 */
export function buildChoices(
	order: string[],
	index: number,
	allAssigned: string[],
): string[] {
	const correct = order[index];
	let seed = index * 7919;
	for (const ch of correct) seed = (seed * 31 + ch.charCodeAt(0)) | 0;
	const rand = mulberry32(seed);

	const pool = order.filter(id => id !== correct);
	// small decks are at least 10 cards, so pool always has >= 3 distractors,
	// but prefer drawing from the whole assigned set for variety
	const widePool = allAssigned.filter(id => id !== correct);
	const distractors = sample(widePool.length >= 3 ? widePool : pool, 3, rand);
	return shuffleArray([correct, ...distractors], rand);
}

export function QuizOverlay({
	order,
	index,
	mode,
	assignments,
	answer,
	onAnswer,
	onAdvance,
}: {
	order: string[];
	index: number;
	mode: QuizMode;
	assignments: Record<string, Assignment>;
	answer: QuizAnswer | undefined;
	onAnswer: (choice: string) => void;
	onAdvance: () => void;
}) {
	const choices = useMemo(
		() => buildChoices(order, index, Object.keys(assignments)),
		[order, index, assignments],
	);

	const correct = order[index];
	const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

	// auto-advance after feedback
	useEffect(() => {
		if (!answer) return;
		advanceTimer.current = setTimeout(onAdvance, answer.correct ? 900 : 1600);
		return () => {
			if (advanceTimer.current) clearTimeout(advanceTimer.current);
		};
	}, [answer, onAdvance]);

	return (
		<div className="pointer-events-auto w-full max-w-2xl rounded-2xl border border-white/15 bg-black/70 p-4 backdrop-blur">
			<div className="mb-3 text-center text-sm text-zinc-300">
				{mode === "easy"
					? "Which image is at this stop?"
					: "Which card is at this stop?"}
			</div>
			<div
				className={`grid gap-3 ${mode === "easy" ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-4"}`}
			>
				{choices.map(cardId => {
					const isCorrect = cardId === correct;
					const isChosen = answer?.choice === cardId;
					let feedback = "";
					if (answer) {
						if (isCorrect) feedback = "ring-4 ring-emerald-500";
						else if (isChosen) feedback = "ring-4 ring-red-500";
						else feedback = "opacity-40";
					}

					return (
						<button
							key={cardId}
							disabled={!!answer}
							onClick={() => onAnswer(cardId)}
							className={`rounded-xl transition ${feedback} ${
								answer ? "" : "hover:scale-[1.03]"
							}`}
						>
							{mode === "easy" ? (
								<span className="block overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900">
									{/* eslint-disable-next-line @next/next/no-img-element */}
									<img
										src={assignments[cardId].url}
										alt=""
										className="aspect-square w-full object-cover"
									/>
									<span className="block truncate px-2 py-1.5 text-xs text-zinc-200">
										{assignments[cardId].name}
									</span>
								</span>
							) : (
								<span
									className="flex flex-col items-center gap-1 rounded-xl border border-zinc-700 bg-zinc-900 px-2 py-3"
									title={cardFullName(cardId)}
								>
									<CardChip cardId={cardId} size="md" />
								</span>
							)}
						</button>
					);
				})}
			</div>
			{answer && (
				<div
					className={`mt-3 text-center text-sm font-semibold ${
						answer.correct ? "text-emerald-400" : "text-red-400"
					}`}
				>
					{answer.correct
						? "Correct!"
						: `It was ${assignments[correct].name} — ${cardFullName(correct)}`}
				</div>
			)}
		</div>
	);
}
