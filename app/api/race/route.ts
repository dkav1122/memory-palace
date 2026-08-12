import { createRoom } from "@/lib/raceRooms";
import type { DeckSize } from "@/store/gameStore";

export async function POST(request: Request) {
	let body: {
		hostId?: string;
		hostName?: string;
		deckSize?: number;
		seed?: number;
	};
	try {
		body = await request.json();
	} catch {
		return Response.json({ error: "Invalid JSON body" }, { status: 400 });
	}

	const hostId = body.hostId?.trim();
	const hostName = body.hostName?.trim() || "Player";
	const deckSize = body.deckSize;
	const seed = body.seed;

	if (!hostId) {
		return Response.json({ error: "hostId is required" }, { status: 400 });
	}
	if (deckSize !== 10 && deckSize !== 26 && deckSize !== 52) {
		return Response.json({ error: "deckSize must be 10, 26, or 52" }, { status: 400 });
	}
	if (typeof seed !== "number" || !Number.isFinite(seed)) {
		return Response.json({ error: "seed is required" }, { status: 400 });
	}

	const room = createRoom(
		hostId,
		hostName,
		deckSize as DeckSize,
		seed >>> 0,
	);
	return Response.json({ room });
}
