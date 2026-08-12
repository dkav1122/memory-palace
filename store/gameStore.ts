import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
	buildSharedOrder,
	generatePlayerId,
	randomSeed,
	type RaceRoom,
} from "@/lib/race";
import { opponentFor } from "@/lib/raceRooms";
import { shuffleArray } from "@/lib/rng";
import {
	deleteAssignment,
	loadAssignments,
	saveAssignment,
	saveRun,
} from "@/lib/storage";

export interface Assignment {
	name: string;
	/** object URL for the stored blob, valid for this page session */
	url: string;
}

export type DeckSize = 10 | 26 | 52;
export type QuizMode = "easy" | "hard";

export interface QuizAnswer {
	choice: string; // cardId chosen
	correct: boolean;
}

export interface OpponentProgress {
	name: string;
	index: number;
	correct: number;
	total: number;
	finished: boolean;
	timeMs: number | null;
}

interface GameState {
	// deck setup
	assignments: Record<string, Assignment>;
	hydrated: boolean;
	hydrate: () => Promise<void>;
	setAssignment: (cardId: string, name: string, blob: Blob) => Promise<void>;
	removeAssignment: (cardId: string) => Promise<void>;

	// walk / shuffle
	order: string[]; // shuffled cardIds for this run
	deckSize: DeckSize;
	index: number;
	walkStartedAt: number | null;
	shuffle: (size: DeckSize) => void;
	setIndex: (i: number) => void;
	next: () => void;
	prev: () => void;

	// quiz
	quizMode: QuizMode;
	quizStartedAt: number | null;
	quizFinishedAt: number | null;
	answers: Record<number, QuizAnswer>;
	startQuiz: (mode: QuizMode) => void;
	answer: (choice: string) => void;
	resetQuiz: () => void;

	// multiplayer / race
	raceSeed: number | null;
	raceRoomCode: string | null;
	playerId: string;
	playerName: string;
	opponent: OpponentProgress | null;
	setPlayerName: (name: string) => void;
	loadSharedOrder: (seed: number, size: DeckSize) => void;
	createRaceRoom: (size: DeckSize) => Promise<string | null>;
	joinRaceRoom: (code: string) => Promise<boolean>;
	syncRaceRoom: () => Promise<void>;
	reportRaceProgress: () => Promise<void>;
	leaveRaceRoom: () => Promise<void>;
}

let hydrating: Promise<void> | null = null;

function opponentFromRoom(
	room: RaceRoom,
	selfId: string,
): OpponentProgress | null {
	const player = opponentFor(room, selfId);
	if (!player) return null;
	return {
		name: player.name,
		index: player.index,
		correct: player.correct,
		total: player.total,
		finished: player.finished,
		timeMs: player.timeMs,
	};
}

export const useGameStore = create<GameState>()(
	persist(
		(setState, getState) => ({
			assignments: {},
			hydrated: false,

			hydrate: async () => {
				if (getState().hydrated) return;
				if (hydrating) return hydrating;
				hydrating = (async () => {
					const stored = await loadAssignments();
					const assignments: Record<string, Assignment> = {};
					for (const [cardId, { name, blob }] of Object.entries(stored)) {
						assignments[cardId] = { name, url: URL.createObjectURL(blob) };
					}
					setState({ assignments, hydrated: true });
				})();
				return hydrating;
			},

			setAssignment: async (cardId, name, blob) => {
				await saveAssignment(cardId, { name, blob });
				const prev = getState().assignments[cardId];
				if (prev) URL.revokeObjectURL(prev.url);
				setState(state => ({
					assignments: {
						...state.assignments,
						[cardId]: { name, url: URL.createObjectURL(blob) },
					},
				}));
			},

			removeAssignment: async cardId => {
				await deleteAssignment(cardId);
				const prev = getState().assignments[cardId];
				if (prev) URL.revokeObjectURL(prev.url);
				setState(state => {
					const assignments = { ...state.assignments };
					delete assignments[cardId];
					return { assignments };
				});
			},

			order: [],
			deckSize: 10,
			index: 0,
			walkStartedAt: null,

			shuffle: size => {
				const assigned = Object.keys(getState().assignments);
				const order = shuffleArray(assigned).slice(0, size);
				setState({
					order,
					deckSize: size,
					index: 0,
					walkStartedAt: Date.now(),
					answers: {},
					quizStartedAt: null,
					quizFinishedAt: null,
				});
			},

			setIndex: i => {
				const { order } = getState();
				setState({ index: Math.max(0, Math.min(order.length - 1, i)) });
			},
			next: () => getState().setIndex(getState().index + 1),
			prev: () => getState().setIndex(getState().index - 1),

			quizMode: "easy",
			quizStartedAt: null,
			quizFinishedAt: null,
			answers: {},

			startQuiz: mode => {
				setState({
					quizMode: mode,
					index: 0,
					answers: {},
					quizStartedAt: Date.now(),
					quizFinishedAt: null,
				});
			},

			answer: choice => {
				const { index, order, answers, quizMode, quizStartedAt, deckSize } =
					getState();
				if (answers[index]) return; // one answer per waypoint
				const correct = choice === order[index];
				const newAnswers = { ...answers, [index]: { choice, correct } };
				const done = Object.keys(newAnswers).length === order.length;
				const finishedAt = done ? Date.now() : null;
				setState({ answers: newAnswers, quizFinishedAt: finishedAt });
				if (done && quizStartedAt) {
					saveRun({
						ts: Date.now(),
						deckSize,
						mode: quizMode,
						correct: Object.values(newAnswers).filter(a => a.correct).length,
						total: order.length,
						timeMs: finishedAt! - quizStartedAt,
					});
				}
			},

			resetQuiz: () =>
				setState({
					answers: {},
					quizStartedAt: null,
					quizFinishedAt: null,
					index: 0,
				}),

			raceSeed: null,
			raceRoomCode: null,
			playerId:
				typeof window !== "undefined"
					? (localStorage.getItem("mp:playerId") ?? generatePlayerId())
					: generatePlayerId(),
			playerName:
				typeof window !== "undefined"
					? (localStorage.getItem("mp:playerName") ?? "Player")
					: "Player",
			opponent: null,

			setPlayerName: name => {
				const trimmed = name.trim() || "Player";
				if (typeof window !== "undefined") {
					localStorage.setItem("mp:playerName", trimmed);
				}
				setState({ playerName: trimmed });
			},

			loadSharedOrder: (seed, size) => {
				const order = buildSharedOrder(size, seed);
				setState({
					order,
					deckSize: size,
					raceSeed: seed,
					index: 0,
					walkStartedAt: Date.now(),
					answers: {},
					quizStartedAt: null,
					quizFinishedAt: null,
				});
			},

			createRaceRoom: async size => {
				const { playerId, playerName } = getState();
				if (typeof window !== "undefined") {
					localStorage.setItem("mp:playerId", playerId);
				}
				const seed = randomSeed();
				getState().loadSharedOrder(seed, size);
				try {
					const res = await fetch("/api/race", {
						method: "POST",
						headers: { "content-type": "application/json" },
						body: JSON.stringify({
							hostId: playerId,
							hostName: playerName,
							deckSize: size,
							seed,
						}),
					});
					if (!res.ok) return null;
					const data = (await res.json()) as { room: RaceRoom };
					setState({
						raceRoomCode: data.room.code,
						opponent: opponentFromRoom(data.room, playerId),
					});
					return data.room.code;
				} catch {
					return null;
				}
			},

			joinRaceRoom: async code => {
				const { playerId, playerName } = getState();
				if (typeof window !== "undefined") {
					localStorage.setItem("mp:playerId", playerId);
				}
				try {
					const res = await fetch(`/api/race/${encodeURIComponent(code)}`, {
						method: "POST",
						headers: { "content-type": "application/json" },
						body: JSON.stringify({
							action: "join",
							playerId,
							name: playerName,
						}),
					});
					if (!res.ok) return false;
					const data = (await res.json()) as { room: RaceRoom };
					getState().loadSharedOrder(data.room.seed, data.room.deckSize);
					setState({
						raceRoomCode: data.room.code,
						opponent: opponentFromRoom(data.room, playerId),
					});
					return true;
				} catch {
					return false;
				}
			},

			syncRaceRoom: async () => {
				const { raceRoomCode, playerId } = getState();
				if (!raceRoomCode) return;
				try {
					const res = await fetch(
						`/api/race/${encodeURIComponent(raceRoomCode)}`,
					);
					if (!res.ok) return;
					const data = (await res.json()) as { room: RaceRoom };
					setState({ opponent: opponentFromRoom(data.room, playerId) });
				} catch {
					// ignore transient network errors during polling
				}
			},

			reportRaceProgress: async () => {
				const {
					raceRoomCode,
					playerId,
					playerName,
					index,
					answers,
					order,
					quizMode,
					quizStartedAt,
					quizFinishedAt,
				} = getState();
				if (!raceRoomCode) return;
				const correct = Object.values(answers).filter(a => a.correct).length;
				const finished = Object.keys(answers).length === order.length;
				const timeMs =
					finished && quizStartedAt && quizFinishedAt
						? quizFinishedAt - quizStartedAt
						: null;
				try {
					const res = await fetch(
						`/api/race/${encodeURIComponent(raceRoomCode)}`,
						{
							method: "POST",
							headers: { "content-type": "application/json" },
							body: JSON.stringify({
								action: "sync",
								playerId,
								name: playerName,
								index,
								correct,
								total: order.length,
								finished,
								timeMs,
								mode: quizStartedAt ? quizMode : undefined,
							}),
						},
					);
					if (!res.ok) return;
					const data = (await res.json()) as { room: RaceRoom };
					setState({ opponent: opponentFromRoom(data.room, playerId) });
				} catch {
					// ignore transient network errors during sync
				}
			},

			leaveRaceRoom: async () => {
				const { raceRoomCode, playerId } = getState();
				if (raceRoomCode) {
					try {
						await fetch(`/api/race/${encodeURIComponent(raceRoomCode)}`, {
							method: "POST",
							headers: { "content-type": "application/json" },
							body: JSON.stringify({ action: "leave", playerId }),
						});
					} catch {
						// best-effort cleanup
					}
				}
				setState({ raceRoomCode: null, raceSeed: null, opponent: null });
			},
		}),
		{
			name: "mp:game",
			storage: createJSONStorage(() => sessionStorage),
			// Object URLs and quiz progress don't survive reloads; persist only
			// the shuffle itself so a mid-walk refresh keeps the same deck order.
			partialize: state => ({
				order: state.order,
				deckSize: state.deckSize,
				quizMode: state.quizMode,
				walkStartedAt: state.walkStartedAt,
				raceSeed: state.raceSeed,
				raceRoomCode: state.raceRoomCode,
				playerId: state.playerId,
				playerName: state.playerName,
			}),
		},
	),
);
