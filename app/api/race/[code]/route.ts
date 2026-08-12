import { getRoom, joinRoom, leaveRoom, updateRoomPlayer } from "@/lib/raceRooms";
import type { QuizMode } from "@/store/gameStore";

export async function GET(
	_request: Request,
	{ params }: { params: Promise<{ code: string }> },
) {
	const { code } = await params;
	const room = getRoom(code);
	if (!room) {
		return Response.json({ error: "Room not found" }, { status: 404 });
	}
	return Response.json({ room });
}

export async function POST(
	request: Request,
	{ params }: { params: Promise<{ code: string }> },
) {
	const { code } = await params;
	let body: {
		action?: string;
		playerId?: string;
		name?: string;
		index?: number;
		correct?: number;
		total?: number;
		finished?: boolean;
		timeMs?: number | null;
		mode?: QuizMode;
	};

	try {
		body = await request.json();
	} catch {
		return Response.json({ error: "Invalid JSON body" }, { status: 400 });
	}

	const playerId = body.playerId?.trim();
	if (!playerId) {
		return Response.json({ error: "playerId is required" }, { status: 400 });
	}

	const action = body.action ?? "sync";

	if (action === "join") {
		const room = joinRoom(code, playerId, body.name?.trim() || "Player");
		if (!room) {
			return Response.json({ error: "Room not found" }, { status: 404 });
		}
		return Response.json({ room });
	}

	if (action === "leave") {
		leaveRoom(code, playerId);
		return Response.json({ ok: true });
	}

	const room = updateRoomPlayer(code, {
		playerId,
		name: body.name,
		index: body.index,
		correct: body.correct,
		total: body.total,
		finished: body.finished,
		timeMs: body.timeMs,
		mode: body.mode,
	});
	if (!room) {
		return Response.json({ error: "Room or player not found" }, { status: 404 });
	}
	return Response.json({ room });
}
