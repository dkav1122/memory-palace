"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getCard, isRedSuit, SUIT_SYMBOL } from "@/lib/cards";
import {
	fetchManifest,
	importEntry,
	type ImportResult,
	type ManifestEntry,
} from "@/lib/deckImport";
import { useGameStore } from "@/store/gameStore";

const STATUS_STYLE: Record<ImportResult["status"], string> = {
	imported: "text-emerald-400",
	updated: "text-sky-400",
	"up-to-date": "text-zinc-500",
	error: "text-red-400",
};

export default function DeckImportPage() {
	const { assignments, hydrated, hydrate, setAssignment } = useGameStore();
	const [entries, setEntries] = useState<ManifestEntry[] | null>(null);
	const [manifestError, setManifestError] = useState<string | null>(null);
	const [results, setResults] = useState<Record<string, ImportResult>>({});
	const [running, setRunning] = useState(false);

	useEffect(() => {
		hydrate();
		fetchManifest()
			.then(m => setEntries(m.entries))
			.catch(err =>
				setManifestError(err instanceof Error ? err.message : String(err)),
			);
	}, [hydrate]);

	const runImport = async (overwrite: boolean) => {
		if (!entries || running) return;
		setRunning(true);
		try {
			for (const entry of entries) {
				const result = await importEntry(
					entry,
					useGameStore.getState().assignments[entry.card],
					setAssignment,
					{ overwrite },
				);
				setResults(prev => ({ ...prev, [entry.card]: result }));
			}
		} finally {
			setRunning(false);
		}
	};

	const missing = entries?.filter(e => !assignments[e.card]).length ?? 0;
	const summary = Object.values(results);

	return (
		<div className="mx-auto max-w-2xl px-6 py-10">
			<Link href="/deck" className="text-sm text-zinc-500 hover:text-zinc-300">
				← Back to deck
			</Link>
			<h1 className="mt-1 text-3xl font-bold">Import card images</h1>
			<p className="mt-2 text-sm text-zinc-400">
				Syncs <code>public/deck-images/manifest.json</code> into your deck.
				Drop image files in that folder, list them in the manifest, then import
				here. Images are square-cropped and downscaled like a normal upload.
			</p>

			{manifestError && (
				<div className="mt-6 rounded-lg border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
					Could not load manifest: {manifestError}
				</div>
			)}

			{!hydrated || entries === null ? (
				!manifestError && <div className="mt-10 text-zinc-500">Loading…</div>
			) : (
				<>
					<div className="mt-6 flex flex-wrap items-center gap-2">
						<button
							onClick={() => runImport(false)}
							disabled={running || missing === 0}
							data-testid="import-missing"
							className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-40"
						>
							{running ? "Importing…" : `Import missing (${missing})`}
						</button>
						<button
							onClick={() => runImport(true)}
							disabled={running}
							data-testid="import-all"
							className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-900 disabled:opacity-40"
						>
							Re-import all ({entries.length})
						</button>
						{summary.length > 0 && !running && (
							<span className="text-sm text-zinc-400" data-testid="import-summary">
								{summary.filter(r => r.status === "imported").length} imported,{" "}
								{summary.filter(r => r.status === "updated").length} updated,{" "}
								{summary.filter(r => r.status === "up-to-date").length} skipped,{" "}
								{summary.filter(r => r.status === "error").length} errors
							</span>
						)}
					</div>

					<ul className="mt-6 divide-y divide-zinc-800 rounded-xl border border-zinc-800">
						{entries.map(entry => {
							const assignment = assignments[entry.card];
							const result = results[entry.card];
							let card;
							try {
								card = getCard(entry.card);
							} catch {
								card = null;
							}
							return (
								<li
									key={`${entry.card}:${entry.file}`}
									className="flex items-center gap-3 px-4 py-2.5 text-sm"
								>
									<span
										className={`w-10 font-bold ${
											card && isRedSuit(card.suit)
												? "text-red-400"
												: "text-zinc-200"
										}`}
									>
										{card ? `${card.rank}${SUIT_SYMBOL[card.suit]}` : entry.card}
									</span>
									{assignment ? (
										// eslint-disable-next-line @next/next/no-img-element
										<img
											src={assignment.url}
											alt={assignment.name}
											className="h-8 w-8 rounded object-cover"
										/>
									) : (
										<span className="h-8 w-8 rounded border border-dashed border-zinc-700" />
									)}
									<span className="flex-1 truncate">
										<span className="text-zinc-200">{entry.name}</span>{" "}
										<span className="text-zinc-600">{entry.file}</span>
									</span>
									<span
										className={
											result
												? STATUS_STYLE[result.status]
												: card === null
													? "text-red-400"
													: assignment
														? "text-zinc-500"
														: "text-amber-400"
										}
									>
										{result
											? result.detail
												? `${result.status} (${result.detail})`
												: result.status
											: card === null
												? `bad card id: ${cardIdError(entry.card)}`
												: assignment
													? "assigned"
													: "not assigned"}
									</span>
								</li>
							);
						})}
					</ul>
					<p className="mt-4 text-xs text-zinc-600">
						“Import missing” only fills unassigned cards. “Re-import all”
						overwrites existing assignments with the manifest versions.
					</p>
				</>
			)}
		</div>
	);
}

function cardIdError(id: string): string {
	return `"${id}" is not a card id`;
}
