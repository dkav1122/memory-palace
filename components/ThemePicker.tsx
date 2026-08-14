"use client";

import { COLOR_THEMES, type ColorThemeId } from "@/lib/colorThemes";
import { PALACE_THEMES, type PalaceThemeId } from "@/lib/palaceThemes";

export function ThemePicker({
	themeId,
	onThemeChange,
	colorThemeId,
	onColorThemeChange,
}: {
	themeId: PalaceThemeId;
	onThemeChange: (id: PalaceThemeId) => void;
	colorThemeId: ColorThemeId;
	onColorThemeChange: (id: ColorThemeId) => void;
}) {
	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-col gap-2">
				<span className="text-xs font-semibold uppercase tracking-wide text-[var(--mp-label)]">
					Map theme
				</span>
				<div className="flex flex-wrap gap-2">
					{PALACE_THEMES.map(theme => {
						const selected = theme.id === themeId;
						return (
							<button
								key={theme.id}
								type="button"
								onClick={() => onThemeChange(theme.id)}
								aria-pressed={selected}
								className={`rounded-xl border px-4 py-3 text-left shadow-sm transition-colors ${
									selected
										? "border-[var(--mp-selected-border)] bg-[var(--mp-selected-bg)]"
										: "border-[var(--mp-card-border)] bg-[var(--mp-card-bg)] hover:border-[var(--mp-card-hover-border)]"
								}`}
								title={theme.description}
							>
								<span className="block text-sm font-bold text-[var(--mp-heading)]">
									{theme.name}
								</span>
								<span className="mt-0.5 block text-xs text-[var(--mp-muted)]">
									{theme.description}
								</span>
							</button>
						);
					})}
				</div>
			</div>

			<div className="flex flex-col gap-2">
				<span className="text-xs font-semibold uppercase tracking-wide text-[var(--mp-label)]">
					Color theme
				</span>
				<div className="flex flex-wrap gap-2">
					{COLOR_THEMES.map(theme => {
						const selected = theme.id === colorThemeId;
						return (
							<button
								key={theme.id}
								type="button"
								onClick={() => onColorThemeChange(theme.id)}
								aria-pressed={selected}
								className={`rounded-xl border px-4 py-3 text-left shadow-sm transition-colors ${
									selected
										? "border-[var(--mp-selected-border)] bg-[var(--mp-selected-bg)]"
										: "border-[var(--mp-card-border)] bg-[var(--mp-card-bg)] hover:border-[var(--mp-card-hover-border)]"
								}`}
								title={theme.description}
							>
								<span className="block text-sm font-bold text-[var(--mp-heading)]">
									{theme.name}
								</span>
								<span className="mt-0.5 block text-xs text-[var(--mp-muted)]">
									{theme.description}
								</span>
							</button>
						);
					})}
				</div>
			</div>
		</div>
	);
}
