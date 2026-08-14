"use client";

import { useEffect } from "react";
import { applyColorTheme } from "@/lib/colorThemes";
import { useGameStore } from "@/store/gameStore";

/** Applies chrome color theme after mount to avoid SSR/hydration mismatch. */
export function ColorThemeSync() {
	const colorThemeId = useGameStore(s => s.colorThemeId);

	useEffect(() => {
		applyColorTheme(colorThemeId);
	}, [colorThemeId]);

	return null;
}
