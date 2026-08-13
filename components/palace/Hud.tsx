"use client";

import { useEffect, useState } from "react";

export function formatMs(ms: number): string {
	const totalSeconds = Math.floor(ms / 1000);
	const m = Math.floor(totalSeconds / 60);
	const s = totalSeconds % 60;
	return `${m}:${s.toString().padStart(2, "0")}`;
}

export function Timer({ startedAt }: { startedAt: number | null }) {
	const [now, setNow] = useState(() => Date.now());

	useEffect(() => {
		const id = setInterval(() => setNow(Date.now()), 500);
		return () => clearInterval(id);
	}, []);

	return (
		<span className="font-mono tabular-nums">
			{startedAt ? formatMs(now - startedAt) : "0:00"}
		</span>
	);
}

export function HudPill({
	children,
	className = "",
	...rest
}: React.ComponentPropsWithoutRef<"div">) {
	return (
		<div
			className={`pointer-events-auto rounded-full border border-white/15 bg-black/55 px-4 py-2 text-sm text-white backdrop-blur ${className}`}
			{...rest}
		>
			{children}
		</div>
	);
}
