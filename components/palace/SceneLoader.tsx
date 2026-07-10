"use client";

import { useEffect, useState } from "react";
import { useProgress } from "@react-three/drei";

/**
 * Full-screen loading overlay shown while the 3D palace assets (models,
 * textures, HDRI) download and upload to the GPU. Driven by drei's
 * `useProgress`, which reads three.js's DefaultLoadingManager and works
 * outside the <Canvas>.
 *
 * Timing is handled with a small state machine so it behaves in both cases:
 * - cold load: overlay stays until loading finishes, then fades out
 * - warm/cached load (no loader activity): overlay hides after a short grace
 */
export function SceneLoader() {
	const { active, progress, total } = useProgress();
	const [hidden, setHidden] = useState(false);

	// `total` counts assets registered with three's loading manager; >0 means a
	// real load happened (vs. a warm mount where everything is already cached).
	const startedLoading = total > 0;

	useEffect(() => {
		if (active) return;
		// Not (or no longer) loading. Give a moment so a cold load's fade reads
		// smoothly, and so a warm mount doesn't flash the overlay off instantly.
		const delay = startedLoading ? 500 : 650;
		const t = setTimeout(() => setHidden(true), delay);
		return () => clearTimeout(t);
	}, [active, startedLoading]);

	const done = hidden && !active;
	const pct = Math.min(100, Math.round(progress));

	return (
		<div
			aria-hidden={done}
			className={`pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center gap-10 bg-[#0b0f14] transition-opacity duration-500 ${
				done ? "opacity-0" : "opacity-100"
			}`}
		>
			<ShufflingDeck />

			<div className="flex flex-col items-center gap-3">
				<div className="text-sm font-medium tracking-wide text-zinc-300">
					Shuffling the deck…
				</div>
				<div className="h-1 w-48 overflow-hidden rounded-full bg-white/10">
					<div
						className="h-full rounded-full bg-emerald-500 transition-[width] duration-300 ease-out"
						style={{ width: `${startedLoading ? pct : 8}%` }}
					/>
				</div>
			</div>
		</div>
	);
}

/**
 * A stack of card backs riffling in a continuous cascade. Purely decorative
 * CSS animation (see `mp-riffle` in globals.css); each card gets a staggered
 * delay and alternating fan direction via CSS custom properties.
 */
const CARDS = Array.from({ length: 7 });

function ShufflingDeck() {
	return (
		<div
			className="relative h-32 w-24"
			style={{ perspective: "700px" }}
			role="img"
			aria-label="A deck of cards being shuffled"
		>
			{CARDS.map((_, i) => {
				const dir = i % 2 === 0 ? 1 : -1;
				return (
					<div
						key={i}
						className="mp-card absolute inset-0 rounded-xl border border-white/20 shadow-xl"
						style={
							{
								"--dir": `${dir * (46 + i * 5)}px`,
								"--rot": `${dir * (14 + i * 2)}deg`,
								animationDelay: `${i * 0.16}s`,
								background:
									"repeating-linear-gradient(45deg, #4f46e5 0, #4f46e5 6px, #4338ca 6px, #4338ca 12px)",
							} as React.CSSProperties
						}
					>
						<div className="absolute inset-1.5 rounded-lg border border-white/25" />
					</div>
				);
			})}
		</div>
	);
}
