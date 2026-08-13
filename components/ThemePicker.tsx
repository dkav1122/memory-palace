"use client";

import {
	PALACE_THEMES,
	PALACE_THEME_IDS,
	type PalaceThemeId,
} from "@/lib/palaceThemes";

export function ThemePicker({
	value,
	onChange,
}: {
	value: PalaceThemeId;
	onChange: (theme: PalaceThemeId) => void;
}) {
	return (
		<div className="flex flex-col gap-2">
			<div className="text-xs font-semibold uppercase tracking-wide text-sky-700">
				Palace theme
			</div>
			<div className="flex flex-wrap gap-2">
				{PALACE_THEME_IDS.map(id => {
					const theme = PALACE_THEMES[id];
					const selected = value === id;
					return (
						<button
							key={id}
							type="button"
							onClick={() => onChange(id)}
							aria-pressed={selected}
							className={
								selected
									? "rounded-xl border border-emerald-500 bg-emerald-50 px-4 py-3 text-left shadow-sm"
									: "rounded-xl border border-sky-200 bg-white/70 px-4 py-3 text-left shadow-sm transition-colors hover:border-sky-400 hover:bg-sky-50"
							}
						>
							<span className="block text-sm font-bold text-sky-950">
								{theme.label}
							</span>
							<span className="mt-0.5 block text-xs text-slate-500">
								{theme.description}
							</span>
						</button>
					);
				})}
			</div>
		</div>
	);
}
