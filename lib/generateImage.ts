/**
 * Client side of the "describe it and let AI draw it" flow.
 * /api/generate-card-image responds with raw JPEG bytes on success or
 * JSON { error } on failure. The blob goes through the same
 * crop/downscale pipeline as an uploaded photo before being stored.
 */

export async function generateCardImage(
	description: string,
	cardId: string,
): Promise<Blob> {
	const res = await fetch("/api/generate-card-image", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ description, cardId }),
	});
	if (!res.ok) {
		const data = (await res.json().catch(() => null)) as {
			error?: string;
		} | null;
		throw new Error(
			data?.error ?? `Image generation failed (HTTP ${res.status})`,
		);
	}
	return res.blob();
}
