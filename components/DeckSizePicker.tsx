"use client";

import type { DeckSize } from "@/store/gameStore";

export const DECK_SIZES: DeckSize[] = [10, 26, 52];

export function DeckSizePicker({
	assignedCount,
	onPick,
}: {
	assignedCount: number;
	onPick: (size: DeckSize) => void;
}) {
	return (
		<div className="flex items-center gap-3">
			{DECK_SIZES.map(size => {
				const enabled = assignedCount >= size;
				return (
					<button
						key={size}
						disabled={!enabled}
						onClick={() => onPick(size)}
						className="flex flex-col items-center rounded-xl border border-zinc-700 bg-zinc-900 px-6 py-4 hover:border-emerald-500 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-30"
						title={
							enabled
								? `Shuffle ${size} cards`
								: `Assign ${size - assignedCount} more photos to unlock`
						}
					>
						<span className="text-2xl font-bold">{size}</span>
						<span className="text-xs text-zinc-400">cards</span>
					</button>
				);
			})}
		</div>
	);
}
