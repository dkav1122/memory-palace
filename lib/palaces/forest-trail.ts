import type { PalaceTheme } from "./types";

export const forestTrail: PalaceTheme = {
	id: "forest-trail",
	name: "Forest trail",
	description: "A winding path through meadows, pines, and standing stones.",
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
	landmarkSet: "forest",
};
