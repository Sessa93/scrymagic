import Image from "next/image";
import Link from "next/link";
import { ScryfallCard, getCardImage } from "@/lib/scryfall";
import RarityBadge from "@/components/RarityBadge";

interface CardGridProps {
  cards: ScryfallCard[];
}

export default function CardGrid({ cards }: CardGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {cards.map((card) => (
        <CardGridItem key={card.id} card={card} />
      ))}
    </div>
  );
}

function CardGridItem({ card }: { card: ScryfallCard }) {
  const imageUrl = getCardImage(card, "png");

  return (
    <Link
      href={`/card/${card.id}`}
      className="group relative overflow-hidden rounded-xl bg-transparent transition-all hover:shadow-lg hover:shadow-accent/10 hover:-translate-y-1"
    >
      <div className="aspect-488/680 w-full overflow-hidden bg-transparent">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={card.name}
            width={200}
            height={279}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-surface text-muted text-sm p-4 text-center">
            {card.name}
          </div>
        )}
      </div>
      <div className="p-2">
        <p className="truncate text-sm font-medium text-foreground">
          {card.name}
        </p>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-muted truncate">{card.set_name}</span>
          <RarityBadge rarity={card.rarity} compact />
        </div>
      </div>
    </Link>
  );
}
