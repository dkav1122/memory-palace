/**
 * Visual themes for the palace walk. Path geometry and camera poses stay
 * identical across themes (see lib/palace.ts) so the method-of-loci route
 * remains familiar; only materials, fog/sky, scatter, and landmark catalogs
 * change.
 */

export const PALACE_THEME_IDS = ["countryside", "jungle", "city"] as const;
export type PalaceThemeId = (typeof PALACE_THEME_IDS)[number];

export interface PalaceTheme {
	id: PalaceThemeId;
	name: string;
	blurb: string;
	terrain: {
		map: string;
		normalMap: string;
		color: string;
	};
	path: {
		map: string;
		normalMap: string;
		color: string;
	};
	grassTuftColor: string;
	showGrassTufts: boolean;
	fog: [color: string, near: number, far: number];
	sky: {
		sunPosition: [number, number, number];
		turbidity: number;
	};
	environmentIntensity: number;
	scatter: {
		models: [string, string];
		count: number;
		sizeMin: number;
		sizeMax: number;
		/** minimum distance from path centerline */
		minOff: number;
	};
	waypointMarker: string;
	waypointMarkerSize: number;
}

export const PALACE_THEMES: Record<PalaceThemeId, PalaceTheme> = {
	countryside: {
		id: "countryside",
		name: "Countryside",
		blurb: "Rolling hills, pines, and a dirt trail.",
		terrain: {
			map: "/textures/grass_color.jpg",
			normalMap: "/textures/grass_normal.jpg",
			color: "#ffffff",
		},
		path: {
			map: "/textures/dirt_color.jpg",
			normalMap: "/textures/dirt_normal.jpg",
			color: "#ffffff",
		},
		grassTuftColor: "#7fa64f",
		showGrassTufts: true,
		fog: ["#cfe3f2", 60, 420],
		sky: { sunPosition: [80, 120, -200], turbidity: 6 },
		environmentIntensity: 0.2,
		scatter: {
			models: [
				"/models/nature/tree_pineRoundA.glb",
				"/models/nature/tree_pineRoundC.glb",
			],
			count: 90,
			sizeMin: 4,
			sizeMax: 8,
			minOff: 55,
		},
		waypointMarker: "/models/nature/path_stoneCircle.glb",
		waypointMarkerSize: 2.4,
	},
	jungle: {
		id: "jungle",
		name: "Jungle",
		blurb: "Dense canopy, deep greens, and humid haze.",
		terrain: {
			map: "/textures/grass_color.jpg",
			normalMap: "/textures/grass_normal.jpg",
			color: "#3a6b28",
		},
		path: {
			map: "/textures/dirt_color.jpg",
			normalMap: "/textures/dirt_normal.jpg",
			color: "#5c4030",
		},
		grassTuftColor: "#3d8a2e",
		showGrassTufts: true,
		fog: ["#9bb89a", 40, 280],
		sky: { sunPosition: [40, 90, -160], turbidity: 10 },
		environmentIntensity: 0.15,
		scatter: {
			models: [
				"/models/nature/tree_oak.glb",
				"/models/nature/tree_default.glb",
			],
			count: 140,
			sizeMin: 5,
			sizeMax: 11,
			minOff: 18,
		},
		waypointMarker: "/models/nature/path_stoneCircle.glb",
		waypointMarkerSize: 2.2,
	},
	city: {
		id: "city",
		name: "City",
		blurb: "Paved streets, plazas, and town landmarks.",
		terrain: {
			map: "/textures/dirt_color.jpg",
			normalMap: "/textures/dirt_normal.jpg",
			color: "#6e7278",
		},
		path: {
			map: "/textures/dirt_color.jpg",
			normalMap: "/textures/dirt_normal.jpg",
			color: "#4a4d52",
		},
		grassTuftColor: "#6a7a5a",
		showGrassTufts: false,
		fog: ["#b8c4d0", 70, 380],
		sky: { sunPosition: [100, 140, -180], turbidity: 3 },
		environmentIntensity: 0.25,
		scatter: {
			models: [
				"/models/hexagon/unit-house.glb",
				"/models/hexagon/unit-mill.glb",
			],
			count: 55,
			sizeMin: 5,
			sizeMax: 9,
			minOff: 40,
		},
		waypointMarker: "/models/nature/statue_ring.glb",
		waypointMarkerSize: 1.6,
	},
};

export const DEFAULT_THEME_ID: PalaceThemeId = "countryside";

export function getPalaceTheme(id: PalaceThemeId | string | undefined): PalaceTheme {
	if (id && id in PALACE_THEMES) return PALACE_THEMES[id as PalaceThemeId];
	return PALACE_THEMES[DEFAULT_THEME_ID];
}
