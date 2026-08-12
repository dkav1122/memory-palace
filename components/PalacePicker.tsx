"use client";

import { PALACES, type PalaceId } from "@/lib/palaces";

export function PalacePicker({
	value,
	onChange,
}: {
	value: PalaceId;
	onChange: (id: PalaceId) => void;
}) {
	return (
		<div className="flex flex-col gap-2">
			<span className="text-xs font-semibold uppercase tracking-wide text-sky-700">
				Memory palace
			</span>
			<div className="flex flex-wrap gap-2">
				{PALACES.map(palace => {
					const selected = palace.id === value;
					return (
						<button
							key={palace.id}
							type="button"
							onClick={() => onChange(palace.id)}
							className={`rounded-xl border px-4 py-3 text-left shadow-sm transition-colors ${
								selected
									? "border-emerald-500 bg-emerald-50"
									: "border-sky-200 bg-white/70 hover:border-sky-400 hover:bg-sky-50"
							}`}
							title={palace.description}
						>
							<span className="block text-sm font-bold text-slate-900">
								{palace.name}
							</span>
							<span className="mt-0.5 block text-xs text-slate-500">
								{palace.description}
							</span>
						</button>
					);
				})}
			</div>
		</div>
	);
}
