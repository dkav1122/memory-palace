/**
 * Local player profile (name + appearance preset). Persisted in localStorage
 * so the create-player flow survives reloads without IndexedDB blobs.
 */

export const APPEARANCE_IDS = [
	"explorer",
	"scholar",
	"athlete",
	"traveler",
] as const;

export type AppearanceId = (typeof APPEARANCE_IDS)[number];

export interface AppearancePreset {
	id: AppearanceId;
	label: string;
	skin: string;
	shirt: string;
	pants: string;
	hair: string;
}

export const APPEARANCES: AppearancePreset[] = [
	{
		id: "explorer",
		label: "Explorer",
		skin: "#c68642",
		shirt: "#2a6f6a",
		pants: "#5c4033",
		hair: "#2b1d14",
	},
	{
		id: "scholar",
		label: "Scholar",
		skin: "#e0ac69",
		shirt: "#1e3a5f",
		pants: "#4a5568",
		hair: "#3d2914",
	},
	{
		id: "athlete",
		label: "Athlete",
		skin: "#8d5524",
		shirt: "#b91c1c",
		pants: "#1a1a1a",
		hair: "#111111",
	},
	{
		id: "traveler",
		label: "Traveler",
		skin: "#f1c27d",
		shirt: "#556b2f",
		pants: "#6b4423",
		hair: "#6b3a2a",
	},
];

export interface PlayerProfile {
	name: string;
	appearance: AppearanceId;
}

const PLAYER_KEY = "mp:player";

export function appearanceById(id: AppearanceId): AppearancePreset {
	return APPEARANCES.find(a => a.id === id) ?? APPEARANCES[0];
}

export function loadPlayer(): PlayerProfile | null {
	if (typeof window === "undefined") return null;
	try {
		const raw = window.localStorage.getItem(PLAYER_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as Partial<PlayerProfile>;
		if (
			typeof parsed.name !== "string" ||
			!parsed.name.trim() ||
			typeof parsed.appearance !== "string" ||
			!APPEARANCE_IDS.includes(parsed.appearance as AppearanceId)
		) {
			return null;
		}
		return {
			name: parsed.name.trim().slice(0, 24),
			appearance: parsed.appearance as AppearanceId,
		};
	} catch {
		return null;
	}
}

export function savePlayer(profile: PlayerProfile): void {
	const cleaned: PlayerProfile = {
		name: profile.name.trim().slice(0, 24),
		appearance: APPEARANCE_IDS.includes(profile.appearance)
			? profile.appearance
			: "explorer",
	};
	window.localStorage.setItem(PLAYER_KEY, JSON.stringify(cleaned));
	window.dispatchEvent(new Event("mp:player"));
}

export function subscribePlayer(onStoreChange: () => void): () => void {
	if (typeof window === "undefined") return () => {};
	const handler = () => onStoreChange();
	window.addEventListener("mp:player", handler);
	window.addEventListener("storage", handler);
	return () => {
		window.removeEventListener("mp:player", handler);
		window.removeEventListener("storage", handler);
	};
}
