/**
 * Walker appearance for the third-person palace character.
 * Procedural mesh (no GLTF) — presets + color slots, persisted in IndexedDB.
 */

export interface CharacterAppearance {
	preset: CharacterPresetId;
	skin: string;
	hair: string;
	shirt: string;
	pants: string;
	/** 0.85–1.15 relative height */
	scale: number;
}

export const CHARACTER_PRESETS = {
	traveler: {
		label: "Traveler",
		skin: "#c68642",
		hair: "#2a1a0e",
		shirt: "#3d6b4f",
		pants: "#3a3a48",
		scale: 1,
	},
	scholar: {
		label: "Scholar",
		skin: "#e0ac69",
		hair: "#5c4033",
		shirt: "#4a5568",
		pants: "#2d3748",
		scale: 0.96,
	},
	athlete: {
		label: "Athlete",
		skin: "#8d5524",
		hair: "#1a1a1a",
		shirt: "#c53030",
		pants: "#1a202c",
		scale: 1.06,
	},
	explorer: {
		label: "Explorer",
		skin: "#f1c27d",
		hair: "#d4a017",
		shirt: "#b7791f",
		pants: "#744210",
		scale: 1.02,
	},
} as const;

export type CharacterPresetId = keyof typeof CHARACTER_PRESETS;

export const DEFAULT_CHARACTER: CharacterAppearance = {
	preset: "traveler",
	skin: CHARACTER_PRESETS.traveler.skin,
	hair: CHARACTER_PRESETS.traveler.hair,
	shirt: CHARACTER_PRESETS.traveler.shirt,
	pants: CHARACTER_PRESETS.traveler.pants,
	scale: CHARACTER_PRESETS.traveler.scale,
};

export function appearanceFromPreset(
	preset: CharacterPresetId,
): CharacterAppearance {
	const p = CHARACTER_PRESETS[preset];
	return {
		preset,
		skin: p.skin,
		hair: p.hair,
		shirt: p.shirt,
		pants: p.pants,
		scale: p.scale,
	};
}
