"use client";

import {
	PALACE_THEME_IDS,
	PALACE_THEMES,
	type PalaceThemeId,
} from "@/lib/palaceThemes";

export function PalaceThemePicker({
	value,
	onChange,
}: {
	value: PalaceThemeId;
	onChange: (id: PalaceThemeId) => void;
}) {
	return (
		<div className="flex flex-col gap-2">
			<div className="text-xs font-semibold uppercase tracking-wide text-sky-700">
				Palace theme
			</div>
			<div className="grid grid-cols-3 gap-2">
				{PALACE_THEME_IDS.map(id => {
					const theme = PALACE_THEMES[id];
					const selected = value === id;
					return (
						<button
							key={id}
							type="button"
							onClick={() => onChange(id)}
							aria-pressed={selected}
							className={`rounded-xl border px-2 py-3 text-left transition-colors ${
								selected
									? "border-emerald-500 bg-emerald-50 shadow-sm"
									: "border-sky-200 bg-white/70 hover:border-sky-400 hover:bg-sky-50"
							}`}
							title={theme.description}
						>
							<span className="block text-sm font-bold text-slate-900">
								{theme.label}
							</span>
							<span className="mt-0.5 block text-[11px] leading-snug text-slate-500">
								{theme.description}
							</span>
						</button>
					);
				})}
			</div>
		</div>
	);
}
