"use client";

import { useState, useSyncExternalStore } from "react";
import {
	APPEARANCE_PRESETS,
	type AppearanceId,
	getServerStoredPlayerSnapshot,
	getStoredPlayerSnapshot,
	savePlayer,
	subscribeStoredPlayer,
	type PlayerProfile,
} from "@/lib/player";

export function PlayerSetup({
	onSaved,
}: {
	onSaved?: (player: PlayerProfile) => void;
}) {
	const saved = useSyncExternalStore(
		subscribeStoredPlayer,
		getStoredPlayerSnapshot,
		getServerStoredPlayerSnapshot,
	);
	const [draftName, setDraftName] = useState<string | null>(null);
	const [draftAppearance, setDraftAppearance] = useState<AppearanceId | null>(
		null,
	);
	const [justSaved, setJustSaved] = useState(false);

	const name = draftName ?? saved?.name ?? "";
	const appearance = draftAppearance ?? saved?.appearance ?? "forest";
	const canSave = name.trim().length > 0;

	function handleSave() {
		if (!canSave) return;
		const player: PlayerProfile = {
			name: name.trim().slice(0, 24),
			appearance,
		};
		savePlayer(player);
		setDraftName(null);
		setDraftAppearance(null);
		setJustSaved(true);
		onSaved?.(player);
		window.setTimeout(() => setJustSaved(false), 1500);
	}

	return (
		<section
			className="rounded-2xl border border-sky-200 bg-white/70 p-6 shadow-sm"
			data-testid="player-setup"
		>
			<div className="text-sm font-semibold uppercase tracking-wide text-sky-700">
				Your player
			</div>
			<h2 className="mt-1 text-xl font-bold text-sky-950">
				{saved ? "Edit player" : "Create a player"}
			</h2>
			<p className="mt-2 text-sm text-slate-600">
				Pick a name and look — you&apos;ll see them walking the palace route.
			</p>

			<label className="mt-4 block text-sm font-medium text-slate-700">
				Name
				<input
					data-testid="player-name"
					type="text"
					maxLength={24}
					value={name}
					onChange={e => setDraftName(e.target.value)}
					placeholder="e.g. Alex"
					className="mt-1 w-full rounded-lg border border-sky-200 bg-white px-3 py-2 text-sky-950 outline-none focus:border-sky-400"
				/>
			</label>

			<div className="mt-4">
				<div className="text-sm font-medium text-slate-700">Appearance</div>
				<div className="mt-2 flex flex-wrap gap-2">
					{APPEARANCE_PRESETS.map(preset => {
						const selected = appearance === preset.id;
						return (
							<button
								key={preset.id}
								type="button"
								data-testid={`appearance-${preset.id}`}
								aria-pressed={selected}
								onClick={() => setDraftAppearance(preset.id)}
								className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
									selected
										? "border-sky-500 bg-sky-50 text-sky-950"
										: "border-sky-200 bg-white text-slate-600 hover:border-sky-300"
								}`}
							>
								<span
									aria-hidden
									className="inline-block h-4 w-4 rounded-full border border-black/10"
									style={{ backgroundColor: preset.tint }}
								/>
								{preset.label}
							</button>
						);
					})}
				</div>
			</div>

			<div className="mt-5 flex flex-wrap items-center gap-3">
				<button
					type="button"
					data-testid="save-player"
					disabled={!canSave}
					onClick={handleSave}
					className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-40"
				>
					{saved ? "Save changes" : "Create player"}
				</button>
				{justSaved && (
					<span className="text-sm text-emerald-700" data-testid="player-saved">
						Saved
					</span>
				)}
				{saved && !justSaved && (
					<span className="text-sm text-slate-500" data-testid="player-current">
						Playing as {saved.name}
					</span>
				)}
			</div>
		</section>
	);
}
