"use client";

import { getCardImage, ScryfallCard } from "@/lib/scryfall";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

export default function RelatedCardsStrip({
  cards,
}: {
  cards: ScryfallCard[];
}) {
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [isPopupHovered, setIsPopupHovered] = useState(false);
  const activeCard = useMemo(
    () =>
      activeCardId
        ? (cards.find((card) => card.id === activeCardId) ?? null)
        : null,
    [activeCardId, cards],
  );

  return (
    <div
      className={`relative w-full max-w-full min-w-0 overflow-visible ${
        activeCard ? "z-130" : ""
      }`}
      onMouseLeave={() => {
        setActiveCardId(null);
        setIsPopupHovered(false);
      }}
    >
      <div className="flex w-full max-w-full min-w-0 gap-4 overflow-x-auto pb-4">
        {cards.map((card) => {
          const cardImage = getCardImage(card, "small");
          const isActive = activeCard?.id === card.id;

          return (
            <Link
              key={card.id}
              href={`/card/${card.id}`}
              className="group w-30 shrink-0"
              onMouseEnter={() => {
                setActiveCardId(card.id);
                setIsPopupHovered(true);
              }}
              onFocus={() => {
                setActiveCardId(card.id);
                setIsPopupHovered(true);
              }}
            >
              <div
                className={`overflow-hidden rounded-md bg-surface shadow-md transition-transform duration-200 ${
                  isActive ? "scale-105" : "group-hover:scale-105"
                }`}
              >
                {cardImage ? (
                  <Image
                    src={cardImage}
                    alt={card.name}
                    width={120}
                    height={167}
                    className="block w-full"
                  />
                ) : (
                  <div className="flex h-41.75 items-center justify-center bg-surface text-xs text-muted">
                    No image
                  </div>
                )}
              </div>
              <div className="mt-1.5 px-0.5">
                <p className="truncate text-xs font-medium text-foreground">
                  {card.name}
                </p>
                <p className="text-[11px] text-muted">
                  {card.set_name}
                  {card.collector_number ? ` #${card.collector_number}` : ""}
                </p>
              </div>
            </Link>
          );
        })}
      </div>

      {activeCard ? (
        <div className="absolute top-2 right-0 z-140 max-w-[calc(100vw-2rem)] overflow-x-auto overflow-y-visible [scrollbar-width:thin]">
          <Link
            href={`/card/${activeCard.id}`}
            className="relative flex w-max items-start overflow-visible"
            onMouseEnter={() => setIsPopupHovered(true)}
            onMouseLeave={() => setIsPopupHovered(false)}
            onFocus={() => setIsPopupHovered(true)}
            onBlur={() => setIsPopupHovered(false)}
          >
            <div
              className={`w-55 overflow-hidden rounded-[18px] border border-card-border bg-surface/95 p-2 shadow-2xl backdrop-blur-sm transition-transform duration-200 ${
                isPopupHovered ? "scale-[1.015]" : ""
              }`}
            >
              <div className="overflow-hidden rounded-md bg-card-bg">
                {getCardImage(activeCard, "normal") ? (
                  <Image
                    src={getCardImage(activeCard, "normal")}
                    alt={`${activeCard.name} preview`}
                    width={204}
                    height={285}
                    className="block w-full"
                  />
                ) : (
                  <div className="flex h-71 w-full items-center justify-center text-xs text-muted">
                    No image
                  </div>
                )}
              </div>
              <div className="mt-2 px-0.5">
                <p className="truncate text-sm font-semibold text-foreground">
                  {activeCard.name}
                </p>
                <p className="text-xs text-muted">
                  {activeCard.set_name}
                  {activeCard.collector_number
                    ? ` #${activeCard.collector_number}`
                    : ""}
                </p>
              </div>
            </div>

            <div
              className={`overflow-hidden transition-[max-width,opacity] duration-200 ease-out ${
                isPopupHovered
                  ? "max-w-52 opacity-100 pointer-events-auto"
                  : "max-w-0 opacity-0 pointer-events-none"
              }`}
            >
              <div className="h-full rounded-2xl border border-card-border bg-surface/95 p-3 shadow-2xl backdrop-blur-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                  Related Card Details
                </p>
                <div className="mt-2 space-y-1.5 text-xs">
                  <p className="text-foreground">
                    <span className="text-muted">Set:</span>{" "}
                    {activeCard.set_name}
                  </p>
                  <p className="text-foreground">
                    <span className="text-muted">Collector:</span>{" "}
                    {activeCard.collector_number ?? "-"}
                  </p>
                  <p className="text-foreground capitalize">
                    <span className="text-muted">Rarity:</span>{" "}
                    {activeCard.rarity}
                  </p>
                  <p className="text-foreground">
                    <span className="text-muted">Type:</span>{" "}
                    {activeCard.type_line}
                  </p>
                </div>
                <p className="mt-3 text-[11px] text-accent">Open this card</p>
              </div>
            </div>
          </Link>
          <div className="pointer-events-none absolute top-0 right-0 h-full w-6 bg-linear-to-l from-card-bg/85 to-transparent" />
        </div>
      ) : null}
    </div>
  );
}
