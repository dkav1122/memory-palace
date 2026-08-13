/**
 * Palace visual themes. Path / waypoints stay shared and deterministic
 * (see lib/palace.ts); only cosmetics — textures, scatter, landmarks,
 * sky/fog/lighting — vary by theme.
 */

export const PALACE_THEME_IDS = ["nature", "town"] as const;
export type PalaceThemeId = (typeof PALACE_THEME_IDS)[number];

export interface PalaceTheme {
	id: PalaceThemeId;
	label: string;
	description: string;
	terrain: {
		map: string;
		normalMap: string;
		repeat: [number, number];
		color?: string;
	};
	path: {
		map: string;
		normalMap: string;
	};
	waypointMarker: string;
	/** Decorative scatter models far from the path */
	scatter: {
		urls: [string, string];
		count: number;
		minDist: number;
		sizeRange: [number, number];
	};
	/** Near-path ground clutter (grass tufts). Null = none. */
	groundCover: {
		url: string;
		color: string;
		count: number;
	} | null;
	sky: {
		sunPosition: [number, number, number];
		turbidity: number;
	};
	fog: {
		color: string;
		near: number;
		far: number;
	};
	sun: {
		intensity: number;
		color: string;
	};
	environmentIntensity: number;
}

export const PALACE_THEMES: Record<PalaceThemeId, PalaceTheme> = {
	nature: {
		id: "nature",
		label: "Nature",
		description: "Rolling grass hills and forest landmarks",
		terrain: {
			map: "/textures/grass_color.jpg",
			normalMap: "/textures/grass_normal.jpg",
			repeat: [45, 132],
		},
		path: {
			map: "/textures/dirt_color.jpg",
			normalMap: "/textures/dirt_normal.jpg",
		},
		waypointMarker: "/models/nature/path_stoneCircle.glb",
		scatter: {
			urls: [
				"/models/nature/tree_pineRoundA.glb",
				"/models/nature/tree_pineRoundC.glb",
			],
			count: 90,
			minDist: 55,
			sizeRange: [4, 8],
		},
		groundCover: {
			url: "/models/nature/grass_leafs.glb",
			color: "#7fa64f",
			count: 1800,
		},
		sky: { sunPosition: [80, 120, -200], turbidity: 6 },
		fog: { color: "#cfe3f2", near: 60, far: 420 },
		sun: { intensity: 3.2, color: "#fff2dc" },
		environmentIntensity: 0.2,
	},
	town: {
		id: "town",
		label: "Town",
		description: "Packed-earth streets and village landmarks",
		terrain: {
			map: "/textures/dirt_color.jpg",
			normalMap: "/textures/dirt_normal.jpg",
			repeat: [35, 100],
			color: "#9a9080",
		},
		path: {
			map: "/textures/dirt_color.jpg",
			normalMap: "/textures/dirt_normal.jpg",
		},
		waypointMarker: "/models/nature/path_stoneCircle.glb",
		scatter: {
			urls: [
				"/models/hexagon/unit-house.glb",
				"/models/hexagon/unit-mill.glb",
			],
			count: 55,
			minDist: 48,
			sizeRange: [3.5, 6.5],
		},
		groundCover: null,
		sky: { sunPosition: [60, 90, -160], turbidity: 4 },
		fog: { color: "#d4cfc4", near: 50, far: 380 },
		sun: { intensity: 2.8, color: "#fff5e8" },
		environmentIntensity: 0.25,
	},
};

export const DEFAULT_PALACE_THEME: PalaceThemeId = "nature";

export function isPalaceThemeId(value: unknown): value is PalaceThemeId {
	return (
		typeof value === "string" &&
		(PALACE_THEME_IDS as readonly string[]).includes(value)
	);
}

export function getPalaceTheme(id: PalaceThemeId): PalaceTheme {
	return PALACE_THEMES[id] ?? PALACE_THEMES[DEFAULT_PALACE_THEME];
}
