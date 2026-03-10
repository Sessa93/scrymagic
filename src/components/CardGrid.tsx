"use client";

import Image from "next/image";
import Link from "next/link";
import { ScryfallCard, getCardImage } from "@/lib/scryfall";
import RarityBadge from "@/components/RarityBadge";
import { useEffect, useRef, useState } from "react";

interface CardGridProps {
  cards: ScryfallCard[];
}

interface HoverPreviewState {
  imageUrl: string;
  cardName: string;
  x: number;
  y: number;
  visible: boolean;
}

const PREVIEW_WIDTH = 320;
const PREVIEW_HEIGHT = 446;
const PREVIEW_GAP = 16;
const HOVER_DELAY_MS = 1000;

export default function CardGrid({ cards }: CardGridProps) {
  const [preview, setPreview] = useState<HoverPreviewState | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const clampPreviewPosition = (x: number, y: number) => {
    const maxX = window.innerWidth - PREVIEW_WIDTH - 8;
    const maxY = window.innerHeight - PREVIEW_HEIGHT - 8;

    return {
      x: Math.max(8, Math.min(x + PREVIEW_GAP, maxX)),
      y: Math.max(8, Math.min(y + PREVIEW_GAP, maxY)),
    };
  };

  const handleHoverStart = (
    e: React.MouseEvent,
    imageUrl: string,
    cardName: string,
  ) => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    const pos = clampPreviewPosition(e.clientX, e.clientY);
    setPreview((prev) =>
      prev
        ? { ...prev, x: pos.x, y: pos.y }
        : { imageUrl, cardName, x: pos.x, y: pos.y, visible: false },
    );

    timerRef.current = window.setTimeout(() => {
      setPreview((prev) => {
        if (!prev) {
          return { imageUrl, cardName, x: pos.x, y: pos.y, visible: true };
        }
        return { ...prev, imageUrl, cardName, visible: true };
      });
      timerRef.current = null;
    }, HOVER_DELAY_MS);
  };

  const handleHoverMove = (e: React.MouseEvent) => {
    const pos = clampPreviewPosition(e.clientX, e.clientY);
    setPreview((prev) => (prev ? { ...prev, x: pos.x, y: pos.y } : prev));
  };

  const handleHoverEnd = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    setPreview((prev) => (prev ? { ...prev, visible: false } : prev));
  };

  const handlePreviewTransitionEnd = () => {
    setPreview((prev) => {
      if (!prev || prev.visible) return prev;
      return null;
    });
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {cards.map((card) => (
          <CardGridItem
            key={card.id}
            card={card}
            onHoverStart={handleHoverStart}
            onHoverMove={handleHoverMove}
            onHoverEnd={handleHoverEnd}
          />
        ))}
      </div>

      {preview ? (
        <div
          className={`pointer-events-none fixed z-100 transition-opacity duration-200 ${
            preview.visible ? "opacity-100" : "opacity-0"
          }`}
          style={{ left: preview.x, top: preview.y }}
          onTransitionEnd={handlePreviewTransitionEnd}
          aria-hidden="true"
        >
          <div className="overflow-hidden rounded-md bg-surface shadow-2xl ring-1 ring-card-border/60">
            <Image
              src={preview.imageUrl}
              alt={preview.cardName}
              width={PREVIEW_WIDTH}
              height={PREVIEW_HEIGHT}
              className="block h-auto w-[320px]"
            />
          </div>
        </div>
      ) : null}
    </>
  );
}

function CardGridItem({
  card,
  onHoverStart,
  onHoverMove,
  onHoverEnd,
}: {
  card: ScryfallCard;
  onHoverStart: (
    e: React.MouseEvent,
    imageUrl: string,
    cardName: string,
  ) => void;
  onHoverMove: (e: React.MouseEvent) => void;
  onHoverEnd: () => void;
}) {
  const imageUrl = getCardImage(card, "png");

  return (
    <Link
      href={`/card/${card.id}`}
      className="group relative overflow-hidden rounded-xl bg-transparent transition-all hover:shadow-lg hover:shadow-accent/10 hover:-translate-y-1"
      onMouseEnter={(e) => {
        if (imageUrl) onHoverStart(e, imageUrl, card.name);
      }}
      onMouseMove={onHoverMove}
      onMouseLeave={onHoverEnd}
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
