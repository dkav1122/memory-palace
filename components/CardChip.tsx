import { getCard, isRedSuit, SUIT_SYMBOL } from "@/lib/cards";

export function CardChip({
	cardId,
	size = "md",
}: {
	cardId: string;
	size?: "sm" | "md" | "lg";
}) {
	const card = getCard(cardId);
	const red = isRedSuit(card.suit);
	const sizeClasses = {
		sm: "w-9 h-12 text-sm rounded-md",
		md: "w-12 h-16 text-lg rounded-lg",
		lg: "w-16 h-22 text-2xl rounded-xl",
	}[size];

	return (
		<span
			className={`${sizeClasses} inline-flex flex-col items-center justify-center bg-white border border-zinc-300 shadow-sm font-semibold leading-none select-none ${
				red ? "text-red-600" : "text-zinc-900"
			}`}
		>
			<span>{card.rank}</span>
			<span>{SUIT_SYMBOL[card.suit]}</span>
		</span>
	);
}
