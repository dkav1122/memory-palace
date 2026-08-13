"use client";

import { useState, useSyncExternalStore } from "react";
import {
	APPEARANCES,
	appearanceById,
	loadPlayer,
	savePlayer,
	subscribePlayer,
	type AppearanceId,
} from "@/lib/player";

export function CreatePlayer() {
	const saved = useSyncExternalStore(subscribePlayer, loadPlayer, () => null);
	// null = mirror saved profile; non-null = in-progress edit
	const [editName, setEditName] = useState<string | null>(null);
	const [editAppearance, setEditAppearance] = useState<AppearanceId | null>(
		null,
	);
	const [savedFlash, setSavedFlash] = useState(false);

	const name = editName ?? saved?.name ?? "";
	const appearance = editAppearance ?? saved?.appearance ?? "explorer";
	const preset = appearanceById(appearance);
	const hasPlayer = !!saved;

	function onSave(e: React.FormEvent) {
		e.preventDefault();
		const trimmed = name.trim();
		if (!trimmed) return;
		savePlayer({ name: trimmed, appearance });
		setEditName(null);
		setEditAppearance(null);
		setSavedFlash(true);
		window.setTimeout(() => setSavedFlash(false), 1500);
	}

	return (
		<form
			onSubmit={onSave}
			className="rounded-2xl border border-sky-200 bg-white/70 p-6 shadow-sm"
			data-testid="create-player"
		>
			<div className="text-sm font-semibold uppercase tracking-wide text-sky-700">
				{hasPlayer ? "Your player" : "Create a player"}
			</div>
			<h2 className="mt-1 text-xl font-bold text-sky-950">
				{hasPlayer ? saved!.name : "Who walks the palace?"}
			</h2>
			<p className="mt-2 text-sm text-slate-600">
				Pick a name and look — you&apos;ll see them walk the route between
				stops.
			</p>

			<label className="mt-4 block text-sm font-medium text-sky-950">
				Name
				<input
					type="text"
					value={name}
					onChange={e => setEditName(e.target.value)}
					maxLength={24}
					placeholder="e.g. Alex"
					className="mt-1 w-full rounded-lg border border-sky-200 bg-white px-3 py-2 text-sky-950 outline-none focus:border-sky-400"
					data-testid="player-name"
				/>
			</label>

			<div className="mt-4">
				<div className="text-sm font-medium text-sky-950">Appearance</div>
				<div className="mt-2 flex flex-wrap gap-2">
					{APPEARANCES.map(a => {
						const selected = appearance === a.id;
						return (
							<button
								key={a.id}
								type="button"
								onClick={() => setEditAppearance(a.id)}
								data-testid={`appearance-${a.id}`}
								aria-pressed={selected}
								className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
									selected
										? "border-emerald-500 bg-emerald-50 text-emerald-900"
										: "border-sky-200 bg-white text-slate-700 hover:border-sky-400"
								}`}
							>
								<span
									className="inline-block h-4 w-4 rounded-full border border-black/10"
									style={{ background: a.shirt }}
									aria-hidden
								/>
								{a.label}
							</button>
						);
					})}
				</div>
			</div>

			<div className="mt-4 flex items-center gap-3">
				<div
					className="flex h-12 w-10 flex-col overflow-hidden rounded-md border border-sky-200"
					aria-hidden
				>
					<div className="h-3" style={{ background: preset.hair }} />
					<div className="h-3" style={{ background: preset.skin }} />
					<div className="flex-1" style={{ background: preset.shirt }} />
					<div className="h-3" style={{ background: preset.pants }} />
				</div>
				<button
					type="submit"
					disabled={!name.trim()}
					data-testid="save-player"
					className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-40"
				>
					{hasPlayer ? "Update player" : "Create player"}
				</button>
				{savedFlash && (
					<span className="text-sm text-emerald-700" data-testid="player-saved">
						Saved
					</span>
				)}
			</div>
		</form>
	);
}
