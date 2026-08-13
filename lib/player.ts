/**
 * Local-first player profile (name + appearance preset).
 * Stored in localStorage — small JSON, no blobs.
 */

export const PLAYER_KEY = "mp:player";
export const PLAYER_EVENT = "mp:player";

export const APPEARANCE_PRESETS = [
	{ id: "forest", label: "Forest", tint: "#3f8f6b" },
	{ id: "sky", label: "Sky", tint: "#4a8ec4" },
	{ id: "amber", label: "Amber", tint: "#c4893a" },
	{ id: "rose", label: "Rose", tint: "#b85c6c" },
	{ id: "slate", label: "Slate", tint: "#6b7280" },
] as const;

export type AppearanceId = (typeof APPEARANCE_PRESETS)[number]["id"];

export interface PlayerProfile {
	name: string;
	appearance: AppearanceId;
}

export const DEFAULT_PLAYER: PlayerProfile = {
	name: "Traveler",
	appearance: "forest",
};

export function appearanceTint(id: AppearanceId): string {
	return (
		APPEARANCE_PRESETS.find(p => p.id === id)?.tint ??
		APPEARANCE_PRESETS[0].tint
	);
}

function parsePlayer(raw: string | null): PlayerProfile | null {
	if (!raw) return null;
	try {
		const parsed = JSON.parse(raw) as Partial<PlayerProfile>;
		const name = typeof parsed.name === "string" ? parsed.name.trim() : "";
		const appearance = APPEARANCE_PRESETS.some(p => p.id === parsed.appearance)
			? (parsed.appearance as AppearanceId)
			: DEFAULT_PLAYER.appearance;
		if (!name) return null;
		return { name: name.slice(0, 24), appearance };
	} catch {
		return null;
	}
}

export function loadPlayer(): PlayerProfile | null {
	if (typeof window === "undefined") return null;
	return parsePlayer(window.localStorage.getItem(PLAYER_KEY));
}

export function savePlayer(player: PlayerProfile): void {
	const name = player.name.trim().slice(0, 24);
	if (!name) return;
	const appearance = APPEARANCE_PRESETS.some(p => p.id === player.appearance)
		? player.appearance
		: DEFAULT_PLAYER.appearance;
	const next: PlayerProfile = { name, appearance };
	window.localStorage.setItem(PLAYER_KEY, JSON.stringify(next));
	playerCache = next;
	window.dispatchEvent(new Event(PLAYER_EVENT));
}

export function resolvePlayer(stored: PlayerProfile | null): PlayerProfile {
	return stored ?? DEFAULT_PLAYER;
}

/** Cached snapshot for useSyncExternalStore (stable reference when unchanged). */
let playerCache: PlayerProfile | null | undefined;

function readPlayerCache(): PlayerProfile {
	if (typeof window === "undefined") return DEFAULT_PLAYER;
	if (playerCache === undefined) {
		playerCache = loadPlayer();
	}
	return playerCache ?? DEFAULT_PLAYER;
}

export function subscribePlayer(onStoreChange: () => void): () => void {
	if (typeof window === "undefined") return () => {};
	const handler = () => {
		playerCache = loadPlayer();
		onStoreChange();
	};
	window.addEventListener("storage", handler);
	window.addEventListener(PLAYER_EVENT, handler);
	return () => {
		window.removeEventListener("storage", handler);
		window.removeEventListener(PLAYER_EVENT, handler);
	};
}

export function getPlayerSnapshot(): PlayerProfile {
	return readPlayerCache();
}

export function getServerPlayerSnapshot(): PlayerProfile {
	return DEFAULT_PLAYER;
}

/** Raw stored profile or null (for create-player UI). */
let storedCache: PlayerProfile | null | undefined;

export function subscribeStoredPlayer(onStoreChange: () => void): () => void {
	return subscribePlayer(() => {
		storedCache = playerCache ?? null;
		onStoreChange();
	});
}

export function getStoredPlayerSnapshot(): PlayerProfile | null {
	if (typeof window === "undefined") return null;
	if (storedCache === undefined) {
		storedCache = loadPlayer();
		playerCache = storedCache;
	}
	return storedCache;
}

export function getServerStoredPlayerSnapshot(): PlayerProfile | null {
	return null;
}
