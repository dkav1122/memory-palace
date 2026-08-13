/**
 * Visual themes for the palace walk. Path / waypoints stay deterministic
 * (see lib/palace.ts); only cosmetics — terrain, scatter, landmarks, sky —
 * change per theme.
 */

export const PALACE_THEME_IDS = ["nature", "city", "jungle"] as const;
export type PalaceThemeId = (typeof PALACE_THEME_IDS)[number];

export interface PalaceTheme {
	id: PalaceThemeId;
	label: string;
	description: string;
	terrain: {
		map: string;
		normalMap: string;
		/** optional multiply tint on the albedo */
		color: string;
		roughness: number;
	};
	path: {
		map: string;
		normalMap: string;
		color: string;
	};
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
	waypointMarker: string;
	/** Instanced ground clutter near the trail (grass tufts, etc.). */
	groundScatter: {
		enabled: boolean;
		url: string;
		color: string;
		count: number;
		seed: number;
	};
	/** Distant decorative props far from the path. */
	distantScatter: {
		count: number;
		seed: number;
		urls: [string, string];
		minDist: number;
		maxDist: number;
		minSize: number;
		maxSize: number;
	};
}

const NATURE = "/models/nature";
const HEXAGON = "/models/hexagon";
const TOWN = "/models/town";

export const PALACE_THEMES: Record<PalaceThemeId, PalaceTheme> = {
	nature: {
		id: "nature",
		label: "Nature",
		description: "Rolling grass hills and woodland landmarks.",
		terrain: {
			map: "/textures/grass_color.jpg",
			normalMap: "/textures/grass_normal.jpg",
			color: "#ffffff",
			roughness: 1,
		},
		path: {
			map: "/textures/dirt_color.jpg",
			normalMap: "/textures/dirt_normal.jpg",
			color: "#ffffff",
		},
		sky: { sunPosition: [80, 120, -200], turbidity: 6 },
		fog: { color: "#cfe3f2", near: 60, far: 420 },
		sun: { intensity: 3.2, color: "#fff2dc" },
		environmentIntensity: 0.2,
		waypointMarker: `${NATURE}/path_stoneCircle.glb`,
		groundScatter: {
			enabled: true,
			url: `${NATURE}/grass_leafs.glb`,
			color: "#7fa64f",
			count: 1800,
			seed: 4242,
		},
		distantScatter: {
			count: 90,
			seed: 777,
			urls: [`${NATURE}/tree_pineRoundA.glb`, `${NATURE}/tree_pineRoundC.glb`],
			minDist: 55,
			maxDist: 145,
			minSize: 4,
			maxSize: 8,
		},
	},
	city: {
		id: "city",
		label: "City",
		description: "Town streets lined with houses, mills, and plazas.",
		terrain: {
			map: "/textures/dirt_color.jpg",
			normalMap: "/textures/dirt_normal.jpg",
			color: "#6a6e72",
			roughness: 0.95,
		},
		path: {
			map: "/textures/dirt_color.jpg",
			normalMap: "/textures/dirt_normal.jpg",
			color: "#9a8f7e",
		},
		sky: { sunPosition: [60, 90, -160], turbidity: 8 },
		fog: { color: "#b8c4ce", near: 50, far: 380 },
		sun: { intensity: 2.6, color: "#ffe8c8" },
		environmentIntensity: 0.28,
		waypointMarker: `${NATURE}/path_stoneCircle.glb`,
		groundScatter: {
			enabled: false,
			url: `${NATURE}/grass_leafs.glb`,
			color: "#7fa64f",
			count: 0,
			seed: 4242,
		},
		distantScatter: {
			count: 70,
			seed: 888,
			urls: [`${HEXAGON}/unit-house.glb`, `${HEXAGON}/unit-mill.glb`],
			minDist: 50,
			maxDist: 130,
			minSize: 5,
			maxSize: 9,
		},
	},
	jungle: {
		id: "jungle",
		label: "Jungle",
		description: "Dense canopy, misty light, and overgrown stops.",
		terrain: {
			map: "/textures/grass_color.jpg",
			normalMap: "/textures/grass_normal.jpg",
			color: "#5f8a3a",
			roughness: 1,
		},
		path: {
			map: "/textures/dirt_color.jpg",
			normalMap: "/textures/dirt_normal.jpg",
			color: "#6b5340",
		},
		sky: { sunPosition: [40, 70, -120], turbidity: 12 },
		fog: { color: "#8fad7a", near: 35, far: 280 },
		sun: { intensity: 2.2, color: "#d4e8a8" },
		environmentIntensity: 0.15,
		waypointMarker: `${NATURE}/path_stoneCircle.glb`,
		groundScatter: {
			enabled: true,
			url: `${NATURE}/grass_leafs.glb`,
			color: "#4d7a28",
			count: 2400,
			seed: 5151,
		},
		distantScatter: {
			count: 140,
			seed: 999,
			urls: [
				`${NATURE}/tree_pineTallA_detailed.glb`,
				`${NATURE}/tree_oak.glb`,
			],
			minDist: 28,
			maxDist: 120,
			minSize: 6,
			maxSize: 12,
		},
	},
};

export const DEFAULT_PALACE_THEME: PalaceThemeId = "nature";

export function getPalaceTheme(id: PalaceThemeId | string): PalaceTheme {
	if (id in PALACE_THEMES) return PALACE_THEMES[id as PalaceThemeId];
	return PALACE_THEMES[DEFAULT_PALACE_THEME];
}

/** Town kit paths reused by city landmarks. */
export const THEME_MODEL_ROOTS = { NATURE, HEXAGON, TOWN } as const;
