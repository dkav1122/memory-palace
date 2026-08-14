import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
	applyColorTheme,
	DEFAULT_COLOR_THEME_ID,
	isColorThemeId,
	type ColorThemeId,
} from "@/lib/colorThemes";
import {
	DEFAULT_THEME_ID,
	isPalaceThemeId,
	type PalaceThemeId,
} from "@/lib/palaceThemes";
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
export type { PalaceThemeId, ColorThemeId };

export interface QuizAnswer {
	choice: string; // cardId chosen
	correct: boolean;
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
	themeId: PalaceThemeId;
	setThemeId: (id: PalaceThemeId) => void;
	colorThemeId: ColorThemeId;
	setColorThemeId: (id: ColorThemeId) => void;
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
}

let hydrating: Promise<void> | null = null;

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
			themeId: DEFAULT_THEME_ID,
			setThemeId: id => setState({ themeId: id }),
			colorThemeId: DEFAULT_COLOR_THEME_ID,
			setColorThemeId: id => {
				applyColorTheme(id);
				setState({ colorThemeId: id });
			},
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
		}),
		{
			name: "mp:game",
			storage: createJSONStorage(() => sessionStorage),
			// Object URLs and quiz progress don't survive reloads; persist only
			// the shuffle itself so a mid-walk refresh keeps the same deck order.
			partialize: state => ({
				order: state.order,
				deckSize: state.deckSize,
				themeId: state.themeId,
				colorThemeId: state.colorThemeId,
				quizMode: state.quizMode,
				walkStartedAt: state.walkStartedAt,
			}),
			merge: (persisted, current) => {
				const p = (persisted ?? {}) as Partial<GameState>;
				const themeId = isPalaceThemeId(p.themeId ?? "")
					? p.themeId!
					: DEFAULT_THEME_ID;
				const colorThemeId = isColorThemeId(p.colorThemeId ?? "")
					? p.colorThemeId!
					: DEFAULT_COLOR_THEME_ID;
				return {
					...current,
					...p,
					themeId,
					colorThemeId,
				};
			},
			onRehydrateStorage: () => state => {
				if (state?.colorThemeId) applyColorTheme(state.colorThemeId);
			},
		},
	),
);
