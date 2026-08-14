/**
 * UI chrome color themes (CSS variables). Separate from 3D map packs in
 * lib/palaceThemes.ts — changing the chrome does not change the palace.
 */

export type ColorThemeId = "sky" | "slate" | "moss";

export interface ColorTheme {
	id: ColorThemeId;
	name: string;
	description: string;
}

export const COLOR_THEMES: ColorTheme[] = [
	{
		id: "sky",
		name: "Sky",
		description: "Light blue home chrome (default).",
	},
	{
		id: "slate",
		name: "Slate",
		description: "Cool gray chrome for a quieter look.",
	},
	{
		id: "moss",
		name: "Moss",
		description: "Soft green accents on a pale field.",
	},
];

export const DEFAULT_COLOR_THEME_ID: ColorThemeId = "sky";

const ids = new Set<string>(COLOR_THEMES.map(t => t.id));

export function isColorThemeId(value: string): value is ColorThemeId {
	return ids.has(value);
}

/** Applies the chrome theme to <html data-color-theme="…">. */
export function applyColorTheme(id: ColorThemeId): void {
	if (typeof document === "undefined") return;
	document.documentElement.dataset.colorTheme = id;
}
