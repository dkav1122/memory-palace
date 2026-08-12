import { DECK } from "@/lib/cards";
import { mulberry32, shuffleArray } from "@/lib/rng";
import type { DeckSize, QuizMode } from "@/store/gameStore";

/** Build an identical card-id sequence for all players from a shared seed. */
export function buildSharedOrder(deckSize: DeckSize, seed: number): string[] {
	const rand = mulberry32(seed >>> 0);
	return shuffleArray(
		DECK.map(c => c.id),
		rand,
	).slice(0, deckSize);
}

export function randomSeed(): number {
	return Math.floor(Math.random() * 0xffffffff);
}

const ROOM_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateRoomCode(): string {
	let code = "";
	for (let i = 0; i < 6; i++) {
		code += ROOM_CHARS[Math.floor(Math.random() * ROOM_CHARS.length)];
	}
	return code;
}

export function generatePlayerId(): string {
	if (typeof crypto !== "undefined" && crypto.randomUUID) {
		return crypto.randomUUID();
	}
	return `p-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Compact share link: base64url JSON { s: seed, n: deckSize }. */
export function encodeRaceLink(seed: number, deckSize: DeckSize): string {
	const json = JSON.stringify({ s: seed, n: deckSize });
	return btoa(json).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeRaceLink(
	encoded: string,
): { seed: number; deckSize: DeckSize } | null {
	try {
		const padded = encoded.replace(/-/g, "+").replace(/_/g, "/");
		const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
		const parsed = JSON.parse(atob(padded + pad)) as {
			s?: number;
			n?: number;
		};
		if (
			typeof parsed.s !== "number" ||
			(parsed.n !== 10 && parsed.n !== 26 && parsed.n !== 52)
		) {
			return null;
		}
		return { seed: parsed.s >>> 0, deckSize: parsed.n };
	} catch {
		return null;
	}
}

export function raceLinkUrl(seed: number, deckSize: DeckSize): string {
	if (typeof window === "undefined") return `/?race=${encodeRaceLink(seed, deckSize)}`;
	return `${window.location.origin}/?race=${encodeRaceLink(seed, deckSize)}`;
}

export function roomLinkUrl(code: string): string {
	if (typeof window === "undefined") return `/?room=${code}`;
	return `${window.location.origin}/?room=${code}`;
}

export interface RacePlayer {
	id: string;
	name: string;
	index: number;
	correct: number;
	total: number;
	finished: boolean;
	timeMs: number | null;
	lastSeen: number;
}

export interface RaceRoom {
	code: string;
	seed: number;
	deckSize: DeckSize;
	order: string[];
	mode: QuizMode | null;
	hostId: string;
	players: Record<string, RacePlayer>;
	createdAt: number;
}

export function missingAssignments(
	order: string[],
	assignments: Record<string, unknown>,
): string[] {
	return order.filter(cardId => !assignments[cardId]);
}
