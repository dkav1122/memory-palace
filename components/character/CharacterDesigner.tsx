"use client";

import {
	CHARACTER_PRESETS,
	appearanceFromPreset,
	type CharacterAppearance,
	type CharacterPresetId,
} from "@/lib/character";

const COLOR_FIELDS: {
	key: keyof Pick<CharacterAppearance, "skin" | "hair" | "shirt" | "pants">;
	label: string;
}[] = [
	{ key: "skin", label: "Skin" },
	{ key: "hair", label: "Hair" },
	{ key: "shirt", label: "Shirt" },
	{ key: "pants", label: "Pants" },
];

/** Live preview of the procedural walker using the same proportions as the 3D mesh. */
function CharacterPreview({ appearance }: { appearance: CharacterAppearance }) {
	const s = appearance.scale;
	return (
		<div
			className="relative mx-auto h-56 w-40"
			style={{ transform: `scale(${s})`, transformOrigin: "bottom center" }}
			aria-hidden
		>
			{/* legs */}
			<div
				className="absolute bottom-2 left-[28%] h-20 w-5 rounded-full"
				style={{ background: appearance.pants }}
			/>
			<div
				className="absolute bottom-2 right-[28%] h-20 w-5 rounded-full"
				style={{ background: appearance.pants }}
			/>
			{/* torso */}
			<div
				className="absolute bottom-[5.25rem] left-1/2 h-24 w-16 -translate-x-1/2 rounded-[1.25rem]"
				style={{ background: appearance.shirt }}
			/>
			{/* arms */}
			<div
				className="absolute bottom-[6.5rem] left-[12%] h-16 w-4 rotate-[12deg] rounded-full"
				style={{ background: appearance.shirt }}
			/>
			<div
				className="absolute bottom-[6.5rem] right-[12%] h-16 w-4 -rotate-[12deg] rounded-full"
				style={{ background: appearance.shirt }}
			/>
			{/* head */}
			<div
				className="absolute bottom-[10.75rem] left-1/2 h-12 w-12 -translate-x-1/2 rounded-full"
				style={{ background: appearance.skin }}
			/>
			{/* hair */}
			<div
				className="absolute bottom-[12.4rem] left-1/2 h-8 w-11 -translate-x-1/2 rounded-t-full"
				style={{ background: appearance.hair }}
			/>
		</div>
	);
}

export function CharacterDesigner({
	appearance,
	onChange,
}: {
	appearance: CharacterAppearance;
	onChange: (next: CharacterAppearance) => void;
}) {
	return (
		<div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_220px]">
			<div className="space-y-6">
				<section>
					<h2 className="text-sm font-semibold uppercase tracking-wide text-sky-700">
						Presets
					</h2>
					<div className="mt-3 flex flex-wrap gap-2">
						{(Object.keys(CHARACTER_PRESETS) as CharacterPresetId[]).map(
							id => {
								const selected = appearance.preset === id;
								return (
									<button
										key={id}
										type="button"
										onClick={() => onChange(appearanceFromPreset(id))}
										className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
											selected
												? "border-emerald-600 bg-emerald-50 text-emerald-900"
												: "border-sky-200 bg-white/70 text-sky-950 hover:border-sky-400"
										}`}
									>
										{CHARACTER_PRESETS[id].label}
									</button>
								);
							},
						)}
					</div>
				</section>

				<section>
					<h2 className="text-sm font-semibold uppercase tracking-wide text-sky-700">
						Colors
					</h2>
					<div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
						{COLOR_FIELDS.map(({ key, label }) => (
							<label
								key={key}
								className="flex flex-col gap-2 rounded-xl border border-sky-200 bg-white/70 p-3 text-sm text-sky-950"
							>
								<span className="font-medium">{label}</span>
								<input
									type="color"
									value={appearance[key]}
									onChange={e =>
										onChange({
											...appearance,
											preset: appearance.preset,
											[key]: e.target.value,
										})
									}
									className="h-10 w-full cursor-pointer rounded border border-sky-100 bg-transparent"
								/>
							</label>
						))}
					</div>
				</section>

				<section>
					<label className="block text-sm font-semibold uppercase tracking-wide text-sky-700">
						Height
						<span className="ml-2 font-normal normal-case text-slate-500">
							{Math.round(appearance.scale * 100)}%
						</span>
					</label>
					<input
						type="range"
						min={0.85}
						max={1.15}
						step={0.01}
						value={appearance.scale}
						onChange={e =>
							onChange({
								...appearance,
								scale: Number(e.target.value),
							})
						}
						className="mt-3 w-full accent-emerald-600"
					/>
				</section>
			</div>

			<div className="flex flex-col items-center justify-center rounded-2xl border border-sky-200 bg-gradient-to-b from-sky-100 to-emerald-50 p-6 shadow-sm">
				<CharacterPreview appearance={appearance} />
				<p className="mt-4 text-center text-xs text-slate-500">
					Preview — same colors appear on the path in the palace.
				</p>
			</div>
		</div>
	);
}
