"use client";

import { formatMs } from "@/components/palace/Hud";
import type { OpponentProgress } from "@/store/gameStore";

export function OpponentHud({
	opponent,
	roomCode,
}: {
	opponent: OpponentProgress;
	roomCode: string;
}) {
	return (
		<div className="pointer-events-auto rounded-xl border border-amber-500/40 bg-amber-950/70 px-4 py-2 backdrop-blur">
			<div className="text-[10px] font-semibold uppercase tracking-wide text-amber-300/80">
				Opponent · room {roomCode}
			</div>
			<div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-amber-50">
				<span className="font-semibold">{opponent.name}</span>
				{opponent.finished ? (
					<span>
						Finished · {opponent.correct}/{opponent.total}
						{opponent.timeMs != null && (
							<span className="ml-1 font-mono text-amber-200">
								{formatMs(opponent.timeMs)}
							</span>
						)}
					</span>
				) : (
					<span>
						Stop {Math.min(opponent.index + 1, opponent.total)} / {opponent.total}
						<span className="ml-2 text-amber-200/80">
							{opponent.correct}/{opponent.total} correct
						</span>
					</span>
				)}
			</div>
		</div>
	);
}
