"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CardChip } from "@/components/CardChip";
import { HudPill, Timer } from "@/components/palace/Hud";
import { PalaceScene } from "@/components/palace/PalaceScene";
import { SceneLoader } from "@/components/palace/SceneLoader";
import { cardFullName } from "@/lib/cards";
import { DeckSizePicker } from "@/components/DeckSizePicker";
import { ThemePicker } from "@/components/ThemePicker";
import { useGameStore } from "@/store/gameStore";

export default function PalacePage() {
	const router = useRouter();
	const {
		assignments,
		hydrated,
		hydrate,
		order,
		index,
		walkStartedAt,
		shuffle,
		next,
		prev,
		themeId,
		setThemeId,
	} = useGameStore();

	useEffect(() => {
		hydrate();
	}, [hydrate]);

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "ArrowRight" || e.key === " ") {
				e.preventDefault();
				next();
			} else if (e.key === "ArrowLeft") {
				e.preventDefault();
				prev();
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [next, prev]);

	if (!hydrated) {
		return (
			<div className="flex h-dvh items-center justify-center text-zinc-500">
				Loading…
			</div>
		);
	}

	const assignedCount = Object.keys(assignments).length;

	// A persisted order can reference cards whose photos were since removed.
	const orderValid =
		order.length > 0 && order.every(cardId => assignments[cardId]);

	if (!orderValid) {
		return (
			<div className="flex h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
				<h1 className="text-3xl font-bold">The walk</h1>
				{assignedCount < 10 ? (
					<>
						<p className="max-w-md text-zinc-400">
							You need at least 10 cards with photos before you can walk the
							palace. You have {assignedCount}.
						</p>
						<Link
							href="/deck"
							className="rounded-lg bg-emerald-600 px-5 py-2.5 font-semibold text-white hover:bg-emerald-500"
						>
							Set up your deck
						</Link>
					</>
				) : (
					<>
						<p className="max-w-md text-zinc-400">
							Pick a map, then shuffle the deck to place your images along the
							route.
						</p>
						<div className="w-full max-w-lg rounded-2xl border border-zinc-700 bg-zinc-900/80 p-4 text-left">
							<ThemePicker value={themeId} onChange={setThemeId} />
						</div>
						<DeckSizePicker
							assignedCount={assignedCount}
							onPick={size => shuffle(size)}
						/>
						<Link href="/" className="text-sm text-zinc-500 hover:text-zinc-300">
							← Home
						</Link>
					</>
				)}
			</div>
		);
	}

	const currentCardId = order[index];
	const current = assignments[currentCardId];

	const billboards = order.map(cardId => ({
		cardId,
		url: assignments[cardId].url,
		revealed: true,
	}));

	return (
		<div className="relative h-dvh w-full overflow-hidden">
			<PalaceScene billboards={billboards} index={index} themeId={themeId} />
			<SceneLoader />

			{/* top bar */}
			<div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-4">
				<div className="flex flex-col gap-2">
					<HudPill>
						<Link href="/" className="hover:underline">
							← Exit
						</Link>
					</HudPill>
					<HudPill>
						{index + 1} / {order.length}
					</HudPill>
				</div>
				<HudPill>
					<Timer startedAt={walkStartedAt} />
				</HudPill>
			</div>

			{/* bottom bar */}
			<div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 p-4">
				<div className="pointer-events-auto flex items-center gap-4 rounded-2xl border border-white/15 bg-black/60 px-5 py-3 backdrop-blur">
					<CardChip cardId={currentCardId} size="lg" />
					<div>
						<div className="text-lg font-semibold text-white">
							{current.name}
						</div>
						<div className="text-xs text-zinc-300">
							{cardFullName(currentCardId)}
						</div>
					</div>
				</div>

				<div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2">
					<button
						onClick={prev}
						disabled={index === 0}
						className="rounded-lg border border-white/20 bg-black/50 px-4 py-2 text-sm text-white backdrop-blur hover:bg-black/70 disabled:opacity-30"
					>
						← Back
					</button>
					<button
						onClick={next}
						disabled={index === order.length - 1}
						className="rounded-lg bg-emerald-600 px-6 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-30"
					>
						Next →
					</button>
					<button
						onClick={() => shuffle(order.length as 10 | 26 | 52)}
						className="rounded-lg border border-white/20 bg-black/50 px-4 py-2 text-sm text-white backdrop-blur hover:bg-black/70"
					>
						Reshuffle
					</button>
					<button
						onClick={() => router.push("/game")}
						className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
					>
						Enter game mode
					</button>
				</div>
				<div className="text-xs text-white/50">
					Use ← → arrow keys or space to walk
				</div>
			</div>
		</div>
	);
}