import { forestTrail } from "./forest-trail";
import { villagePath } from "./village-path";
import type { PalaceId, PalaceTheme } from "./types";

export type { PalaceId, PalaceTheme, LandmarkSet, LandmarkType } from "./types";

export const PALACES: PalaceTheme[] = [forestTrail, villagePath];

export const DEFAULT_PALACE_ID: PalaceId = "forest-trail";

const byId = new Map<PalaceId, PalaceTheme>(
	PALACES.map(p => [p.id, p]),
);

export function getPalace(id: PalaceId): PalaceTheme {
	return byId.get(id) ?? forestTrail;
}

export function isPalaceId(value: string): value is PalaceId {
	return byId.has(value as PalaceId);
}
