export type Suit = "hearts" | "diamonds" | "clubs" | "spades";

export const SUITS: Suit[] = ["hearts", "diamonds", "clubs", "spades"];

export const RANKS = [
	"A",
	"2",
	"3",
	"4",
	"5",
	"6",
	"7",
	"8",
	"9",
	"10",
	"J",
	"Q",
	"K",
] as const;

export type Rank = (typeof RANKS)[number];

export interface Card {
	id: string; // e.g. "QH", "10S"
	rank: Rank;
	suit: Suit;
}

export const SUIT_SYMBOL: Record<Suit, string> = {
	hearts: "♥",
	diamonds: "♦",
	clubs: "♣",
	spades: "♠",
};

export const SUIT_NAME: Record<Suit, string> = {
	hearts: "Hearts",
	diamonds: "Diamonds",
	clubs: "Clubs",
	spades: "Spades",
};

export function isRedSuit(suit: Suit): boolean {
	return suit === "hearts" || suit === "diamonds";
}

const SUIT_CODE: Record<Suit, string> = {
	hearts: "H",
	diamonds: "D",
	clubs: "C",
	spades: "S",
};

export const DECK: Card[] = SUITS.flatMap(suit =>
	RANKS.map(rank => ({ id: `${rank}${SUIT_CODE[suit]}`, rank, suit })),
);

const BY_ID = new Map(DECK.map(c => [c.id, c]));

export function getCard(id: string): Card {
	const card = BY_ID.get(id);
	if (!card) throw new Error(`Unknown card id: ${id}`);
	return card;
}

export function cardLabel(id: string): string {
	const card = getCard(id);
	return `${card.rank}${SUIT_SYMBOL[card.suit]}`;
}

export function cardFullName(id: string): string {
	const card = getCard(id);
	const rankNames: Record<string, string> = {
		A: "Ace",
		J: "Jack",
		Q: "Queen",
		K: "King",
	};
	return `${rankNames[card.rank] ?? card.rank} of ${SUIT_NAME[card.suit]}`;
}
