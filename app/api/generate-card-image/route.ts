import { cardFullName } from "@/lib/cards";

/**
 * Generates a card image from a text description using OpenAI's Images API
 * (gpt-image models produce real raster output, unlike text-only models).
 * Local-only for now — requires OPENAI_API_KEY in .env.local.
 *
 * Responds with raw JPEG bytes on success, JSON { error } otherwise.
 */

const OPENAI_URL = "https://api.openai.com/v1/images/generations";
const DEFAULT_MODEL = "gpt-image-1";
const DEFAULT_QUALITY = "low"; // final card texture is only 512px

const STYLE =
	"Vivid, colorful, instantly memorable illustration with one clear central subject filling the frame. Bold shapes, strong lighting, no text.";

export async function POST(request: Request) {
	const apiKey = process.env.OPENAI_API_KEY;
	if (!apiKey) {
		return Response.json(
			{ error: "OPENAI_API_KEY is not set. Add it to .env.local." },
			{ status: 500 },
		);
	}

	let body: { description?: string; cardId?: string };
	try {
		body = await request.json();
	} catch {
		return Response.json({ error: "Invalid JSON body" }, { status: 400 });
	}

	const description = body.description?.trim();
	if (!description) {
		return Response.json(
			{ error: "A description is required" },
			{ status: 400 },
		);
	}

	let cardContext = "";
	if (body.cardId) {
		try {
			cardContext = ` This image represents the ${cardFullName(body.cardId)} playing card in a memory game.`;
		} catch {
			// unknown card id — context is optional, ignore
		}
	}

	const res = await fetch(OPENAI_URL, {
		method: "POST",
		headers: {
			"content-type": "application/json",
			authorization: `Bearer ${apiKey}`,
		},
		body: JSON.stringify({
			model: process.env.OPENAI_IMAGE_MODEL ?? DEFAULT_MODEL,
			prompt: `${description}.${cardContext} ${STYLE}`,
			size: "1024x1024",
			quality: process.env.OPENAI_IMAGE_QUALITY ?? DEFAULT_QUALITY,
			output_format: "jpeg",
		}),
	});

	if (!res.ok) {
		const detail = await res.text().catch(() => "");
		return Response.json(
			{
				error: `OpenAI API error (HTTP ${res.status}): ${detail.slice(0, 300)}`,
			},
			{ status: 502 },
		);
	}

	const data = (await res.json()) as { data?: { b64_json?: string }[] };
	const b64 = data.data?.[0]?.b64_json;
	if (!b64) {
		return Response.json(
			{ error: "OpenAI did not return an image" },
			{ status: 502 },
		);
	}

	return new Response(Buffer.from(b64, "base64"), {
		headers: { "content-type": "image/jpeg" },
	});
}
