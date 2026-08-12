"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { submitRequest, type SupportRequestType } from "@/lib/support";

const REQUEST_TYPES: Array<{ value: SupportRequestType; label: string; hint: string }> = [
	{ value: "bug", label: "@bug", hint: "Something is broken" },
	{ value: "incident", label: "@incident", hint: "Urgent — the game is unusable" },
	{ value: "feature", label: "@feature", hint: "An idea or improvement" },
];

export default function SupportPage() {
	const router = useRouter();
	const [type, setType] = useState<SupportRequestType>("bug");
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [submitterName, setSubmitterName] = useState("");
	const [submitterContact, setSubmitterContact] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (submitting) return;
		setSubmitting(true);
		setError(null);
		try {
			const res = await submitRequest({
				type,
				title: title.trim(),
				description,
				submitterName: submitterName.trim() || undefined,
				submitterContact: submitterContact.trim() || undefined,
			});
			router.push(`/support/${res.id}`);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Submission failed");
			setSubmitting(false);
		}
	}

	return (
		<main className="relative mx-auto flex min-h-dvh max-w-2xl flex-col px-6 py-14 text-slate-900">
			<div
				aria-hidden
				className="fixed inset-0 -z-10 bg-gradient-to-b from-sky-50 via-sky-100 to-sky-200"
			/>
			<Link href="/" className="text-sm text-slate-500 hover:text-slate-700">
				← Back to Memory Palace
			</Link>
			<header className="mt-2 mb-8">
				<h1 className="text-4xl font-bold tracking-tight text-sky-950">
					Support
				</h1>
				<p className="mt-2 text-slate-600">
					Report a bug, an incident, or request a feature. No account or sign-in
					is required — your report is filed verbatim and you can track its
					progress on a live timeline.
				</p>
			</header>

			<form
				onSubmit={handleSubmit}
				className="rounded-2xl border border-sky-200 bg-white/70 p-6 shadow-sm"
			>
				<fieldset>
					<legend className="text-sm font-semibold uppercase tracking-wide text-sky-700">
						What kind of request?
					</legend>
					<div className="mt-2 grid gap-2 sm:grid-cols-3">
						{REQUEST_TYPES.map(option => (
							<button
								key={option.value}
								type="button"
								onClick={() => setType(option.value)}
								className={`rounded-xl border p-3 text-left transition ${
									type === option.value
										? "border-emerald-500 bg-emerald-50"
										: "border-sky-200 bg-white/60 hover:border-sky-400"
								}`}
							>
								<div className="font-mono text-sm font-semibold text-sky-950">
									{option.label}
								</div>
								<div className="mt-0.5 text-xs text-slate-500">
									{option.hint}
								</div>
							</button>
						))}
					</div>
				</fieldset>

				<label className="mt-5 block">
					<span className="text-sm font-semibold uppercase tracking-wide text-sky-700">
						Title
					</span>
					<input
						type="text"
						value={title}
						onChange={e => setTitle(e.target.value)}
						required
						maxLength={200}
						placeholder="Short summary of the problem or idea"
						className="mt-1 w-full rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-emerald-500"
					/>
				</label>

				<label className="mt-4 block">
					<span className="text-sm font-semibold uppercase tracking-wide text-sky-700">
						Description
					</span>
					<textarea
						value={description}
						onChange={e => setDescription(e.target.value)}
						required
						maxLength={5000}
						rows={6}
						placeholder="What happened? What did you expect? Steps to reproduce, if you have them."
						className="mt-1 w-full rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-emerald-500"
					/>
				</label>

				<div className="mt-4 grid gap-4 sm:grid-cols-2">
					<label className="block">
						<span className="text-sm font-semibold uppercase tracking-wide text-sky-700">
							Your name{" "}
							<span className="font-normal normal-case text-slate-400">
								(optional)
							</span>
						</span>
						<input
							type="text"
							value={submitterName}
							onChange={e => setSubmitterName(e.target.value)}
							className="mt-1 w-full rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
						/>
					</label>
					<label className="block">
						<span className="text-sm font-semibold uppercase tracking-wide text-sky-700">
							Contact{" "}
							<span className="font-normal normal-case text-slate-400">
								(optional)
							</span>
						</span>
						<input
							type="text"
							value={submitterContact}
							onChange={e => setSubmitterContact(e.target.value)}
							placeholder="Email, Discord, …"
							className="mt-1 w-full rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-emerald-500"
						/>
					</label>
				</div>

				{error && (
					<p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
						{error}
					</p>
				)}

				<button
					type="submit"
					disabled={submitting || !title.trim() || !description.trim()}
					className="mt-6 w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-40"
				>
					{submitting ? "Submitting…" : "Submit request"}
				</button>
			</form>
		</main>
	);
}
