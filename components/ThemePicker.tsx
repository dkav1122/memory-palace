"use client";

import { PALACE_THEMES, type PalaceThemeId } from "@/lib/palaceThemes";

export function ThemePicker({
	value,
	onChange,
}: {
	value: PalaceThemeId;
	onChange: (id: PalaceThemeId) => void;
}) {
	return (
		<div className="flex flex-col gap-2">
			<span className="text-xs font-semibold uppercase tracking-wide text-sky-700">
				Palace theme
			</span>
			<div className="flex flex-wrap gap-2">
				{PALACE_THEMES.map(theme => {
					const selected = theme.id === value;
					return (
						<button
							key={theme.id}
							type="button"
							onClick={() => onChange(theme.id)}
							className={`rounded-xl border px-4 py-3 text-left shadow-sm transition-colors ${
								selected
									? "border-emerald-500 bg-emerald-50"
									: "border-sky-200 bg-white/70 hover:border-sky-400 hover:bg-sky-50"
							}`}
							title={theme.description}
						>
							<span className="block text-sm font-bold text-slate-900">
								{theme.name}
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
