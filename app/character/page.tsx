"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CharacterDesigner } from "@/components/character/CharacterDesigner";
import type { CharacterAppearance } from "@/lib/character";
import { useGameStore } from "@/store/gameStore";

export default function CharacterPage() {
	const { hydrated, hydrate, character, setCharacter } = useGameStore();
	const [draft, setDraft] = useState<CharacterAppearance | null>(null);
	const [saved, setSaved] = useState(false);
	const appearance = draft ?? character;

	useEffect(() => {
		hydrate();
	}, [hydrate]);

	if (!hydrated) {
		return (
			<div className="flex h-dvh items-center justify-center text-zinc-500">
				Loading…
			</div>
		);
	}

	return (
		<main className="relative mx-auto flex min-h-dvh max-w-4xl flex-col px-6 py-10 text-slate-900">
			<div
				aria-hidden
				className="fixed inset-0 -z-10 bg-gradient-to-b from-sky-50 via-sky-100 to-sky-200"
			/>
			<Link href="/" className="text-sm text-slate-500 hover:text-slate-700">
				← Home
			</Link>
			<header className="mb-8 mt-2">
				<h1 className="text-3xl font-bold tracking-tight text-sky-950">
					Your character
				</h1>
				<p className="mt-2 max-w-xl text-sm text-slate-600">
					Design the walker you see on the path. Presets and colors are saved
					in this browser and used on every palace walk.
				</p>
			</header>

			<CharacterDesigner
				appearance={appearance}
				onChange={next => {
					setDraft(next);
					setSaved(false);
				}}
			/>

			<div className="mt-8 flex flex-wrap items-center gap-3">
				<button
					type="button"
					onClick={async () => {
						await setCharacter(appearance);
						setDraft(null);
						setSaved(true);
					}}
					className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500"
				>
					Save character
				</button>
				{saved && (
					<span className="text-sm font-medium text-emerald-700">Saved</span>
				)}
				<Link
					href="/palace"
					className="text-sm text-slate-500 hover:text-slate-700"
				>
					Open the walk →
				</Link>
			</div>
		</main>
	);
}
