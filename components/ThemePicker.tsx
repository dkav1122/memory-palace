"use client";

import {
	PALACE_THEME_IDS,
	PALACE_THEMES,
	type PalaceThemeId,
} from "@/lib/palaceThemes";

export function ThemePicker({
	value,
	onChange,
}: {
	value: PalaceThemeId;
	onChange: (id: PalaceThemeId) => void;
}) {
	return (
		<div className="flex flex-col gap-2">
			<div className="text-xs font-semibold uppercase tracking-wide text-sky-700">
				Map theme
			</div>
			<div className="flex flex-wrap items-stretch gap-2">
				{PALACE_THEME_IDS.map(id => {
					const theme = PALACE_THEMES[id];
					const selected = value === id;
					return (
						<button
							key={id}
							type="button"
							onClick={() => onChange(id)}
							aria-pressed={selected}
							className={`flex min-w-[7.5rem] flex-1 flex-col rounded-xl border px-3 py-3 text-left shadow-sm transition-colors ${
								selected
									? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-400/60"
									: "border-sky-200 bg-white/70 hover:border-sky-400 hover:bg-sky-50"
							}`}
						>
							<span className="text-sm font-bold text-slate-900">
								{theme.name}
							</span>
							<span className="mt-0.5 text-[11px] leading-snug text-slate-500">
								{theme.blurb}
							</span>
						</button>
					);
				})}
			</div>
		</div>
	);
}
