/**
 * Visual asset packs for each palace theme. Geometry (path, terrain height,
 * waypoints) stays in lib/palace.ts so every theme keeps the same deterministic
 * route — only materials, scatter, landmarks, and atmosphere change.
 */

export type PalaceThemeId = "countryside" | "jungle" | "city";

export type LandmarkSet = "countryside" | "jungle" | "city";

export interface PalaceTheme {
	id: PalaceThemeId;
	name: string;
	description: string;
	fog: { color: string; near: number; far: number };
	sky: { sunPosition: [number, number, number]; turbidity: number };
	hdri: string;
	environmentIntensity: number;
	sun: { color: string; intensity: number };
	terrain: {
		colorMap: string;
		normalMap: string;
		repeat: [number, number];
		tint?: string;
	};
	path: {
		colorMap: string;
		normalMap: string;
		tint?: string;
	};
	scatter: {
		tuftModel: string;
		tuftColor: string;
		treeModels: [string, string];
	};
	waypointMarker: string;
	landmarkSet: LandmarkSet;
}

export const PALACE_THEMES: PalaceTheme[] = [
	{
		id: "countryside",
		name: "Countryside",
		description: "Rolling hills, pines, and a dirt path through meadows.",
		fog: { color: "#cfe3f2", near: 60, far: 420 },
		sky: { sunPosition: [80, 120, -200], turbidity: 6 },
		hdri: "/hdri/sky_1k.hdr",
		environmentIntensity: 0.2,
		sun: { color: "#fff2dc", intensity: 3.2 },
		terrain: {
			colorMap: "/textures/grass_color.jpg",
			normalMap: "/textures/grass_normal.jpg",
			repeat: [45, 132],
		},
		path: {
			colorMap: "/textures/dirt_color.jpg",
			normalMap: "/textures/dirt_normal.jpg",
		},
		scatter: {
			tuftModel: "/models/nature/grass_leafs.glb",
			tuftColor: "#7fa64f",
			treeModels: [
				"/models/nature/tree_pineRoundA.glb",
				"/models/nature/tree_pineRoundC.glb",
			],
		},
		waypointMarker: "/models/nature/path_stoneCircle.glb",
		landmarkSet: "countryside",
	},
	{
		id: "jungle",
		name: "Jungle",
		description: "Dense canopy, deep greens, and a trail through thick brush.",
		fog: { color: "#9cbc88", near: 40, far: 280 },
		sky: { sunPosition: [40, 70, -160], turbidity: 8 },
		hdri: "/hdri/sky_1k.hdr",
		environmentIntensity: 0.15,
		sun: { color: "#e8ffc8", intensity: 2.4 },
		terrain: {
			colorMap: "/textures/grass_color.jpg",
			normalMap: "/textures/grass_normal.jpg",
			repeat: [55, 150],
			tint: "#4a7a32",
		},
		path: {
			colorMap: "/textures/dirt_color.jpg",
			normalMap: "/textures/dirt_normal.jpg",
			tint: "#5c4a2e",
		},
		scatter: {
			tuftModel: "/models/nature/plant_bush.glb",
			tuftColor: "#3d6b28",
			treeModels: [
				"/models/nature/tree_pineTallA_detailed.glb",
				"/models/nature/tree_oak.glb",
			],
		},
		waypointMarker: "/models/nature/rock_largeE.glb",
		landmarkSet: "jungle",
	},
	{
		id: "city",
		name: "City",
		description: "A paved lane past cottages, fountains, and mill towers.",
		fog: { color: "#d4d0c8", near: 55, far: 380 },
		sky: { sunPosition: [60, 90, -180], turbidity: 3 },
		hdri: "/hdri/sky_1k.hdr",
		environmentIntensity: 0.28,
		sun: { color: "#fff0e0", intensity: 3.0 },
		terrain: {
			colorMap: "/textures/dirt_color.jpg",
			normalMap: "/textures/dirt_normal.jpg",
			repeat: [40, 120],
			tint: "#9a958c",
		},
		path: {
			colorMap: "/textures/dirt_color.jpg",
			normalMap: "/textures/dirt_normal.jpg",
			tint: "#6e6860",
		},
		scatter: {
			tuftModel: "/models/nature/plant_bush.glb",
			tuftColor: "#6b8f4a",
			treeModels: [
				"/models/hexagon/unit-house.glb",
				"/models/town/windmill.glb",
			],
		},
		waypointMarker: "/models/town/fountain-round.glb",
		landmarkSet: "city",
	},
];

export const DEFAULT_THEME_ID: PalaceThemeId = "countryside";

const byId = new Map<PalaceThemeId, PalaceTheme>(
	PALACE_THEMES.map(t => [t.id, t]),
);

export function getPalaceTheme(id: PalaceThemeId): PalaceTheme {
	return byId.get(id) ?? PALACE_THEMES[0];
}

export function isPalaceThemeId(value: string): value is PalaceThemeId {
	return byId.has(value as PalaceThemeId);
}
