"use client";

import { type RecommendedCard } from "@/lib/recommender";
import { proxyScryfallImageUrl } from "@/lib/scryfall";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

export default function RecommendedCardsStrip({
  title,
  cards,
  emptyMessage,
}: {
  title: string;
  cards: RecommendedCard[];
  emptyMessage: string;
}) {
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [isPopupHovered, setIsPopupHovered] = useState(false);
  const activeCard = useMemo(
    () =>
      activeCardId
        ? (cards.find((card) => card.card_id === activeCardId) ?? null)
        : null,
    [activeCardId, cards],
  );

  return (
    <div className={`relative overflow-visible ${activeCard ? "z-130" : ""}`}>
      <div className="rounded-xl border border-card-border bg-card-bg/80 p-3 backdrop-blur-sm">
        <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
          {title} ({cards.length}/5)
        </h2>

        {cards.length > 0 ? (
          <div
            className="relative w-full max-w-full min-w-0 overflow-visible"
            onMouseLeave={() => {
              setActiveCardId(null);
              setIsPopupHovered(false);
            }}
          >
            <div className="flex w-full max-w-full min-w-0 gap-4 overflow-x-auto pb-4">
              {cards.map((candidate) => {
                const isActive = activeCard?.card_id === candidate.card_id;

                return (
                  <Link
                    key={candidate.card_id}
                    href={`/card/${candidate.card_id}`}
                    className="group w-30 shrink-0"
                    onMouseEnter={() => {
                      setActiveCardId(candidate.card_id);
                      setIsPopupHovered(true);
                    }}
                    onFocus={() => {
                      setActiveCardId(candidate.card_id);
                      setIsPopupHovered(true);
                    }}
                  >
                    <div
                      className={`overflow-hidden rounded-md bg-surface shadow-md transition-transform duration-200 ${
                        isActive ? "scale-105" : "group-hover:scale-105"
                      }`}
                    >
                      {candidate.image_uri ? (
                        <Image
                          src={proxyScryfallImageUrl(candidate.image_uri)}
                          alt={candidate.name}
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
                        {candidate.name}
                      </p>
                      <p className="text-[11px] text-muted">
                        {candidate.set_code.toUpperCase()}
                        {candidate.collector_number
                          ? ` #${candidate.collector_number}`
                          : ""}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>

            {activeCard ? (
              <div className="absolute top-2 right-0 z-140 max-w-[calc(100vw-2rem)] overflow-x-auto overflow-y-visible [scrollbar-width:thin]">
                <Link
                  href={`/card/${activeCard.card_id}`}
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
                      {activeCard.image_uri ? (
                        <Image
                          src={proxyScryfallImageUrl(activeCard.image_uri)}
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
                        {activeCard.set_code.toUpperCase()}
                        {activeCard.collector_number
                          ? ` #${activeCard.collector_number}`
                          : ""}
                      </p>
                    </div>
                  </div>

                  <div
                    className={`min-w-0 overflow-hidden transition-[max-width,opacity] duration-200 ease-out ${
                      isPopupHovered
                        ? "max-w-56 opacity-100 pointer-events-auto"
                        : "max-w-0 opacity-0 pointer-events-none"
                    }`}
                  >
                    <div className="h-full min-w-52 rounded-2xl border border-card-border bg-surface/95 p-3 shadow-2xl backdrop-blur-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                        Recommendation Details
                      </p>
                      <div className="mt-2 space-y-1.5 text-xs">
                        <p className="text-foreground">
                          <span className="text-muted">Set:</span>{" "}
                          {activeCard.set_code.toUpperCase()}
                        </p>
                        <p className="text-foreground">
                          <span className="text-muted">Collector:</span>{" "}
                          {activeCard.collector_number ?? "-"}
                        </p>
                        <p className="text-foreground">
                          <span className="text-muted">Similarity:</span>{" "}
                          {Math.max(
                            0,
                            Math.min(100, Math.round(activeCard.score * 100)),
                          )}
                          %
                        </p>
                      </div>
                      {activeCard.oracle_text ? (
                        <p className="mt-3 line-clamp-4 text-[11px] leading-relaxed text-muted">
                          {activeCard.oracle_text}
                        </p>
                      ) : null}
                      <p className="mt-3 text-[11px] text-accent">
                        Open this card
                      </p>
                    </div>
                  </div>
                </Link>
                <div className="pointer-events-none absolute top-0 right-0 h-full w-6 bg-linear-to-l from-card-bg/85 to-transparent" />
              </div>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-muted">{emptyMessage}</p>
        )}
      </div>
    </div>
  );
}
