import type { PalaceTheme } from "./types";

export const villagePath: PalaceTheme = {
	id: "village-path",
	name: "Village path",
	description: "A cobbled lane past cottages, wells, and a windmill on the hill.",
	fog: { color: "#e8dcc8", near: 55, far: 400 },
	sky: { sunPosition: [60, 90, -180], turbidity: 4 },
	hdri: "/hdri/sky_1k.hdr",
	environmentIntensity: 0.25,
	sun: { color: "#ffe8c8", intensity: 3.0 },
	terrain: {
		colorMap: "/textures/dirt_color.jpg",
		normalMap: "/textures/dirt_normal.jpg",
		repeat: [45, 132],
		tint: "#c4a882",
	},
	path: {
		colorMap: "/textures/dirt_color.jpg",
		normalMap: "/textures/dirt_normal.jpg",
		tint: "#8a7355",
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
	landmarkSet: "village",
};
