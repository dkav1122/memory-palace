"use client";

import { useState } from "react";
import { DeckSizePicker } from "@/components/DeckSizePicker";
import { roomLinkUrl } from "@/lib/race";
import type { DeckSize } from "@/store/gameStore";

export function RaceLobby({
	assignedCount,
	playerName,
	onNameChange,
	onCreateRoom,
	onJoinRoom,
}: {
	assignedCount: number;
	playerName: string;
	onNameChange: (name: string) => void;
	onCreateRoom: (size: DeckSize) => Promise<string | null>;
	onJoinRoom: (code: string) => Promise<boolean>;
}) {
	const [joinCode, setJoinCode] = useState("");
	const [roomCode, setRoomCode] = useState<string | null>(null);
	const [shareLink, setShareLink] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	const handleCreate = async (size: DeckSize) => {
		setBusy(true);
		setError(null);
		const code = await onCreateRoom(size);
		setBusy(false);
		if (!code) {
			setError("Could not create a race room. Try again.");
			return;
		}
		setRoomCode(code);
		setShareLink(roomLinkUrl(code));
	};

	const handleJoin = async () => {
		const code = joinCode.trim().toUpperCase();
		if (!code) return;
		setBusy(true);
		setError(null);
		const ok = await onJoinRoom(code);
		setBusy(false);
		if (!ok) {
			setError("Room not found. Check the code and try again.");
			return;
		}
		setRoomCode(code);
	};

	const copyLink = async () => {
		if (!shareLink) return;
		try {
			await navigator.clipboard.writeText(shareLink);
		} catch {
			// clipboard may be unavailable
		}
	};

	return (
		<div className="rounded-2xl border border-violet-200 bg-white/70 p-6 shadow-sm">
			<div className="text-sm font-semibold uppercase tracking-wide text-violet-700">
				Race a friend
			</div>
			<h2 className="mt-1 text-xl font-bold text-sky-950">
				Live two-player race
			</h2>
			<p className="mt-2 text-sm text-slate-600">
				Create a room or join with a code. Both players get the same shuffled
				deck and see each other&apos;s live progress during game mode.
			</p>

			<label className="mt-4 block text-sm text-slate-600">
				Your name
				<input
					value={playerName}
					onChange={e => onNameChange(e.target.value)}
					maxLength={24}
					className="mt-1 w-full rounded-lg border border-sky-200 bg-white px-3 py-2 text-slate-900"
					placeholder="Player"
				/>
			</label>

			{assignedCount < 10 ? (
				<p className="mt-4 text-sm text-slate-500">
					Assign at least 10 photos before racing.
				</p>
			) : (
				<div className="mt-4">
					<div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
						Host — pick deck size
					</div>
					<div className="mt-2">
						<DeckSizePicker assignedCount={assignedCount} onPick={handleCreate} />
					</div>
				</div>
			)}

			<div className="mt-4 flex flex-wrap items-end gap-2">
				<label className="min-w-0 flex-1 text-sm text-slate-600">
					Join with room code
					<input
						value={joinCode}
						onChange={e => setJoinCode(e.target.value.toUpperCase())}
						maxLength={6}
						className="mt-1 w-full rounded-lg border border-sky-200 bg-white px-3 py-2 font-mono uppercase tracking-widest text-slate-900"
						placeholder="ABC123"
					/>
				</label>
				<button
					type="button"
					disabled={busy || !joinCode.trim()}
					onClick={handleJoin}
					className="rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-40"
				>
					Join
				</button>
			</div>

			{roomCode && (
				<div className="mt-4 rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm">
					<div className="font-semibold text-violet-900">
						Room {roomCode} — shuffle loaded
					</div>
					<p className="mt-1 text-violet-800">
						Memorize the deck on the walk, then enter game mode to race.
					</p>
					{shareLink && (
						<div className="mt-3 flex flex-wrap items-center gap-2">
							<input
								readOnly
								value={shareLink}
								className="min-w-0 flex-1 rounded-lg border border-violet-200 bg-white px-2 py-1.5 text-xs text-slate-700"
							/>
							<button
								type="button"
								onClick={copyLink}
								className="rounded-lg border border-violet-300 px-3 py-1.5 text-xs font-semibold text-violet-800 hover:bg-violet-100"
							>
								Copy link
							</button>
						</div>
					)}
				</div>
			)}

			{error && <p className="mt-3 text-sm text-red-600">{error}</p>}
			{busy && <p className="mt-2 text-sm text-slate-500">Connecting…</p>}
		</div>
	);
}
