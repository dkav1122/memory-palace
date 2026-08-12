import type { LandmarkType } from "@/lib/palace";

export type PalaceId = "forest-trail" | "village-path";

/** Visual assets and atmosphere for a palace theme (geometry stays shared). */
export interface PalaceTheme {
	id: PalaceId;
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
	/** Which landmark model set Landmarks renders. */
	landmarkSet: LandmarkSet;
}

export type LandmarkSet = "forest" | "village";

export type { LandmarkType };
