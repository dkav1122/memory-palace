import { getCard } from "@/lib/cards";
import { processPhoto } from "@/lib/storage";

/**
 * Repo-side card image pipeline. Images (agent-generated or user-provided)
 * are dropped into `public/deck-images/` and listed in
 * `public/deck-images/manifest.json`; the /deck/import page syncs the
 * manifest into IndexedDB with the same crop/downscale as a manual upload.
 */

export interface ManifestEntry {
	/** Card id, e.g. "QH", "10D" */
	card: string;
	/** Filename inside public/deck-images/ */
	file: string;
	/** Display name stored with the assignment */
	name: string;
}

export interface DeckImageManifest {
	entries: ManifestEntry[];
}

export type ImportStatus =
	| "imported"
	| "up-to-date"
	| "updated"
	| "error";

export interface ImportResult {
	entry: ManifestEntry;
	status: ImportStatus;
	detail?: string;
}

export async function fetchManifest(): Promise<DeckImageManifest> {
	const res = await fetch("/deck-images/manifest.json", { cache: "no-store" });
	if (!res.ok) throw new Error(`manifest.json: HTTP ${res.status}`);
	const manifest = (await res.json()) as DeckImageManifest;
	if (!Array.isArray(manifest.entries)) {
		throw new Error("manifest.json must have an `entries` array");
	}
	return manifest;
}

/**
 * Import one manifest entry. `existingName` is the currently-assigned name
 * for the card (if any), used to decide whether anything changed.
 */
export async function importEntry(
	entry: ManifestEntry,
	existing: { name: string } | undefined,
	setAssignment: (cardId: string, name: string, blob: Blob) => Promise<void>,
	options: { overwrite: boolean },
): Promise<ImportResult> {
	try {
		getCard(entry.card); // validates the card id
		if (existing && !options.overwrite) {
			return { entry, status: "up-to-date", detail: "already assigned" };
		}
		const res = await fetch(`/deck-images/${entry.file}`, {
			cache: "no-store",
		});
		if (!res.ok) {
			return { entry, status: "error", detail: `HTTP ${res.status}` };
		}
		const blob = await processPhoto(await res.blob());
		await setAssignment(entry.card, entry.name, blob);
		return { entry, status: existing ? "updated" : "imported" };
	} catch (err) {
		return {
			entry,
			status: "error",
			detail: err instanceof Error ? err.message : String(err),
		};
	}
}
