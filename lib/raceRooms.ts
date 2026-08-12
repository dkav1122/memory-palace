import {
	buildSharedOrder,
	generateRoomCode,
	type RacePlayer,
	type RaceRoom,
} from "@/lib/race";
import type { DeckSize, QuizMode } from "@/store/gameStore";

/** In-memory room store — sufficient for v1 live races on a single server instance. */
const rooms = new Map<string, RaceRoom>();

const ROOM_TTL_MS = 2 * 60 * 60 * 1000;
const STALE_PLAYER_MS = 5 * 60 * 1000;

function pruneStaleRooms(): void {
	const now = Date.now();
	for (const [code, room] of rooms) {
		if (now - room.createdAt > ROOM_TTL_MS) {
			rooms.delete(code);
			continue;
		}
		for (const [id, player] of Object.entries(room.players)) {
			if (now - player.lastSeen > STALE_PLAYER_MS) {
				delete room.players[id];
			}
		}
		if (Object.keys(room.players).length === 0) {
			rooms.delete(code);
		}
	}
}

export function createRoom(
	hostId: string,
	hostName: string,
	deckSize: DeckSize,
	seed: number,
): RaceRoom {
	pruneStaleRooms();
	let code = generateRoomCode();
	while (rooms.has(code)) code = generateRoomCode();

	const order = buildSharedOrder(deckSize, seed);
	const now = Date.now();
	const room: RaceRoom = {
		code,
		seed,
		deckSize,
		order,
		mode: null,
		hostId,
		players: {
			[hostId]: {
				id: hostId,
				name: hostName,
				index: 0,
				correct: 0,
				total: order.length,
				finished: false,
				timeMs: null,
				lastSeen: now,
			},
		},
		createdAt: now,
	};
	rooms.set(code, room);
	return room;
}

export function getRoom(code: string): RaceRoom | null {
	pruneStaleRooms();
	return rooms.get(code.toUpperCase()) ?? null;
}

export function joinRoom(
	code: string,
	playerId: string,
	playerName: string,
): RaceRoom | null {
	const room = getRoom(code);
	if (!room) return null;
	const now = Date.now();
	room.players[playerId] = room.players[playerId] ?? {
		id: playerId,
		name: playerName,
		index: 0,
		correct: 0,
		total: room.order.length,
		finished: false,
		timeMs: null,
		lastSeen: now,
	};
	room.players[playerId].name = playerName;
	room.players[playerId].lastSeen = now;
	return room;
}

export interface PlayerUpdate {
	playerId: string;
	name?: string;
	index?: number;
	correct?: number;
	total?: number;
	finished?: boolean;
	timeMs?: number | null;
	mode?: QuizMode;
}

export function updateRoomPlayer(
	code: string,
	update: PlayerUpdate,
): RaceRoom | null {
	const room = getRoom(code);
	if (!room) return null;
	const player = room.players[update.playerId];
	if (!player) return null;

	if (update.name !== undefined) player.name = update.name;
	if (update.index !== undefined) player.index = update.index;
	if (update.correct !== undefined) player.correct = update.correct;
	if (update.total !== undefined) player.total = update.total;
	if (update.finished !== undefined) player.finished = update.finished;
	if (update.timeMs !== undefined) player.timeMs = update.timeMs;
	if (update.mode !== undefined) room.mode = update.mode;
	player.lastSeen = Date.now();
	return room;
}

export function leaveRoom(code: string, playerId: string): void {
	const room = getRoom(code);
	if (!room) return;
	delete room.players[playerId];
	if (Object.keys(room.players).length === 0) {
		rooms.delete(code.toUpperCase());
	}
}

export function opponentFor(
	room: RaceRoom,
	selfId: string,
): RacePlayer | null {
	for (const player of Object.values(room.players)) {
		if (player.id !== selfId) return player;
	}
	return null;
}
