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
						className="flex flex-col items-center rounded-xl border border-sky-200 bg-white/70 px-6 py-4 shadow-sm transition-colors hover:border-sky-400 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-40"
						title={
							enabled
								? `Shuffle ${size} cards`
								: `Assign ${size - assignedCount} more photos to unlock`
						}
					>
						<span className="text-2xl font-bold text-slate-900">{size}</span>
						<span className="text-xs text-sky-600">cards</span>
					</button>
				);
			})}
		</div>
	);
}
