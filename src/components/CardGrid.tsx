"use client";

import Image from "next/image";
import Link from "next/link";
import {
  getCardSymbols,
  ScryfallCard,
  formatManaCost,
  getCardImage,
} from "@/lib/scryfall";
import RarityBadge from "@/components/RarityBadge";
import ManaSymbol from "@/components/ManaSymbol";
import ScryfallText, {
  buildSymbolDictionary,
  type ScryfallSymbolDictionary,
} from "@/components/ScryfallText";
import { useEffect, useRef, useState } from "react";

interface CardGridProps {
  cards: ScryfallCard[];
}

interface HoverPreviewState {
  card: ScryfallCard;
  imageUrl: string;
  infoWidth: number;
  x: number;
  y: number;
  visible: boolean;
  expanded: boolean;
}

const COLLAPSED_PREVIEW_WIDTH = 360;
const MIN_EXPANDED_INFO_WIDTH = 288;
const MAX_EXPANDED_INFO_WIDTH = 460;
const PREVIEW_HEIGHT = 502;
const PREVIEW_GAP = 16;
const HOVER_DELAY_MS = 1000;
const EXPAND_DELAY_MS = 700;
const HIDE_DELAY_MS = 140;

export default function CardGrid({ cards }: CardGridProps) {
  const [preview, setPreview] = useState<HoverPreviewState | null>(null);
  const [symbolDictionary, setSymbolDictionary] =
    useState<ScryfallSymbolDictionary>({});
  const showTimerRef = useRef<number | null>(null);
  const expandTimerRef = useRef<number | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const pointerRef = useRef({ x: 0, y: 0 });

  const clearTimers = () => {
    if (showTimerRef.current !== null) {
      window.clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }

    if (expandTimerRef.current !== null) {
      window.clearTimeout(expandTimerRef.current);
      expandTimerRef.current = null;
    }

    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  };

  const cancelHide = () => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  };

  const scheduleHide = () => {
    cancelHide();
    hideTimerRef.current = window.setTimeout(() => {
      setPreview((prev) =>
        prev ? { ...prev, visible: false, expanded: false } : prev,
      );
      hideTimerRef.current = null;
    }, HIDE_DELAY_MS);
  };

  useEffect(() => {
    let cancelled = false;

    getCardSymbols()
      .then((symbols) => {
        if (!cancelled) {
          setSymbolDictionary(buildSymbolDictionary(symbols));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSymbolDictionary({});
        }
      });

    return () => {
      cancelled = true;
      clearTimers();
    };
  }, []);

  const clampPreviewPosition = (
    x: number,
    y: number,
    expanded: boolean,
    infoWidth: number,
  ) => {
    const previewWidth = expanded
      ? COLLAPSED_PREVIEW_WIDTH + infoWidth
      : COLLAPSED_PREVIEW_WIDTH;
    const maxX = window.innerWidth - previewWidth - 8;
    const maxY = window.innerHeight - PREVIEW_HEIGHT - 8;

    return {
      x: Math.max(8, Math.min(x + PREVIEW_GAP, maxX)),
      y: Math.max(8, Math.min(y + PREVIEW_GAP, maxY)),
    };
  };

  const handleHoverStart = (
    e: React.MouseEvent,
    card: ScryfallCard,
    imageUrl: string,
  ) => {
    clearTimers();
    cancelHide();

    pointerRef.current = { x: e.clientX, y: e.clientY };

    const infoWidth = getExpandedInfoWidth(card);
    const pos = clampPreviewPosition(e.clientX, e.clientY, false, infoWidth);
    setPreview((prev) =>
      prev
        ? {
            ...prev,
            card,
            imageUrl,
            infoWidth,
            x: pos.x,
            y: pos.y,
            visible: false,
            expanded: false,
          }
        : {
            card,
            imageUrl,
            infoWidth,
            x: pos.x,
            y: pos.y,
            visible: false,
            expanded: false,
          },
    );

    showTimerRef.current = window.setTimeout(() => {
      setPreview((prev) => {
        if (!prev) {
          return {
            card,
            imageUrl,
            infoWidth,
            x: pos.x,
            y: pos.y,
            visible: true,
            expanded: false,
          };
        }
        return { ...prev, card, imageUrl, visible: true, expanded: false };
      });

      expandTimerRef.current = window.setTimeout(() => {
        setPreview((prev) => {
          if (!prev || !prev.visible) {
            return prev;
          }

          const expandedPos = clampPreviewPosition(
            pointerRef.current.x,
            pointerRef.current.y,
            true,
            prev.infoWidth,
          );

          return {
            ...prev,
            expanded: true,
            x: expandedPos.x,
            y: expandedPos.y,
          };
        });
        expandTimerRef.current = null;
      }, EXPAND_DELAY_MS);

      showTimerRef.current = null;
    }, HOVER_DELAY_MS);
  };

  const handleHoverMove = (e: React.MouseEvent) => {
    pointerRef.current = { x: e.clientX, y: e.clientY };
    setPreview((prev) => {
      if (!prev) return prev;
      const pos = clampPreviewPosition(
        e.clientX,
        e.clientY,
        prev.expanded,
        prev.infoWidth,
      );
      return { ...prev, x: pos.x, y: pos.y };
    });
  };

  const handleHoverEnd = () => {
    if (showTimerRef.current !== null) {
      window.clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
    if (expandTimerRef.current !== null) {
      window.clearTimeout(expandTimerRef.current);
      expandTimerRef.current = null;
    }

    scheduleHide();
  };

  const handlePreviewEnter = () => {
    cancelHide();
  };

  const handlePreviewLeave = () => {
    scheduleHide();
  };

  const handlePreviewTransitionEnd = () => {
    setPreview((prev) => {
      if (!prev || prev.visible) return prev;
      return null;
    });
  };

  return (
    <>
      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
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
          className={`fixed z-100 transition-[opacity,transform,width] duration-300 ease-out ${
            preview.visible
              ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
              : "pointer-events-none translate-y-2 scale-[0.985] opacity-0"
          }`}
          style={{
            left: preview.x,
            top: preview.y,
            width: preview.expanded
              ? COLLAPSED_PREVIEW_WIDTH + preview.infoWidth
              : COLLAPSED_PREVIEW_WIDTH,
          }}
          onTransitionEnd={handlePreviewTransitionEnd}
          onMouseEnter={handlePreviewEnter}
          onMouseLeave={handlePreviewLeave}
        >
          <div className="flex overflow-hidden rounded-[18px] border border-card-border/70 bg-card-bg/92 shadow-[0_30px_80px_rgba(0,0,0,0.45)] ring-1 ring-white/8 backdrop-blur-md">
            <div className="relative shrink-0 overflow-hidden bg-surface/70">
              <Image
                src={preview.imageUrl}
                alt={preview.card.name}
                width={COLLAPSED_PREVIEW_WIDTH}
                height={PREVIEW_HEIGHT}
                className="block h-auto w-90"
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-black/45 to-transparent" />
            </div>

            <div
              className={`flex h-125.5 flex-col overflow-hidden border-l border-card-border/50 transition-[width,opacity,transform,padding] duration-300 ease-out ${
                preview.expanded
                  ? "translate-x-0 px-5 py-4 opacity-100"
                  : "w-0 -translate-x-4 px-0 py-4 opacity-0"
              }`}
              style={
                preview.expanded ? { width: preview.infoWidth } : undefined
              }
            >
              <ExpandedPreviewContent
                card={preview.card}
                symbols={symbolDictionary}
              />
            </div>
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
    card: ScryfallCard,
    imageUrl: string,
  ) => void;
  onHoverMove: (e: React.MouseEvent) => void;
  onHoverEnd: () => void;
}) {
  const imageUrl = getCardImage(card, "png");

  return (
    <Link
      href={`/card/${card.id}`}
      className="group relative overflow-hidden rounded-lg bg-transparent transition-all hover:shadow-lg hover:shadow-accent/10 hover:-translate-y-0.5"
      onMouseEnter={(e) => {
        if (imageUrl) onHoverStart(e, card, imageUrl);
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
        <p className="truncate text-xs font-medium text-foreground">
          {card.name}
        </p>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[11px] text-muted truncate">
            {card.set_name}
          </span>
          <RarityBadge rarity={card.rarity} compact />
        </div>
      </div>
    </Link>
  );
}

function ExpandedPreviewContent({
  card,
  symbols,
}: {
  card: ScryfallCard;
  symbols: ScryfallSymbolDictionary;
}) {
  const manaSymbols = formatManaCost(card.mana_cost);
  const oracleText =
    card.oracle_text ||
    card.card_faces
      ?.map((face) => face.oracle_text)
      .filter(Boolean)
      .join("\n\n") ||
    "";
  const typeLine =
    card.type_line ||
    card.card_faces?.map((face) => face.type_line).join(" // ") ||
    "";
  const statLine = getPreviewStatLine(card);
  const previewPrice = getPreviewPrice(card);
  const setQuery = `set:${card.set}`;
  const setHref = buildSearchHref(setQuery);
  const artistQuery = card.artist
    ? `a:"${card.artist.replaceAll('"', '\\"')}"`
    : null;
  const artistHref = artistQuery ? buildSearchHref(artistQuery) : null;

  return (
    <div className="flex h-full min-w-0 select-text flex-col">
      <div className="mb-3 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-foreground">
              <ScryfallText text={card.name} symbols={symbols} />
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              <ScryfallText
                text={typeLine}
                symbols={symbols}
                symbolClassName="mx-0.5 inline-block h-3.5 w-3.5 align-[-0.15em]"
              />
            </p>
          </div>
          {manaSymbols.length > 0 ? (
            <div className="flex shrink-0 flex-wrap justify-end gap-1 pt-0.5">
              {manaSymbols.map((symbol, index) => (
                <ManaSymbol
                  key={`${card.id}-${symbol}-${index}`}
                  symbol={symbol}
                  svgUri={symbols[symbol]?.svg_uri}
                  label={symbols[symbol]?.english}
                  className="inline-block h-4.5 w-4.5"
                />
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="inline-flex items-center rounded-sm border border-card-border/60 bg-surface/70 px-2 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
            {card.set.toUpperCase()} #{card.collector_number ?? "-"}
          </div>
          <RarityBadge rarity={card.rarity} compact />
        </div>
      </div>

      <div className="mb-3 rounded-sm border border-card-border/40 bg-surface/35 px-3 py-2.5">
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted/80">
          Oracle Snapshot
        </div>
        <div
          className="text-[13px] leading-5 text-foreground/82"
          style={{
            display: "-webkit-box",
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: 6,
            overflow: "hidden",
          }}
        >
          {oracleText ? (
            <ScryfallText
              text={oracleText}
              symbols={symbols}
              symbolClassName="mx-0.5 inline-block h-[0.95em] w-[0.95em] align-[-0.12em]"
            />
          ) : (
            "No oracle text available."
          )}
        </div>
      </div>

      <div className="mt-auto grid grid-cols-2 gap-2 text-xs">
        <PreviewStat label="Price" value={previewPrice} />
        <PreviewStat label="Mana Value" value={card.cmc.toString()} />
        <PreviewStat label="Stats" value={statLine} />
        <PreviewStatLink label="Set" value={card.set_name} href={setHref} />
        {artistHref ? (
          <PreviewStatLink
            label="Artist"
            value={card.artist ?? "Unknown"}
            href={artistHref}
          />
        ) : (
          <PreviewStat label="Artist" value="Unknown" />
        )}
      </div>
    </div>
  );
}

function PreviewStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-card-border/40 bg-surface/55 px-3 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted/90">
        {label}
      </div>
      <div className="mt-1 truncate text-sm font-medium text-foreground">
        {value}
      </div>
    </div>
  );
}

function PreviewStatLink({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href: string;
}) {
  return (
    <div className="rounded-sm border border-card-border/40 bg-surface/55 px-3 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted/90">
        {label}
      </div>
      <Link
        href={href}
        className="mt-1 block text-sm leading-snug font-medium text-accent hover:text-accent-hover hover:underline wrap-break-word"
      >
        {value}
      </Link>
    </div>
  );
}

function getPreviewStatLine(card: ScryfallCard): string {
  if (card.power || card.toughness) {
    return `${card.power ?? "?"}/${card.toughness ?? "?"}`;
  }

  if (card.loyalty) {
    return `Loyalty ${card.loyalty}`;
  }

  return "-";
}

function getPreviewPrice(card: ScryfallCard): string {
  if (card.prices.usd) {
    return `$${card.prices.usd}`;
  }

  if (card.prices.usd_foil) {
    return `$${card.prices.usd_foil} foil`;
  }

  if (card.prices.eur) {
    return `EUR ${card.prices.eur}`;
  }

  if (card.prices.tix) {
    return `${card.prices.tix} tix`;
  }

  return "N/A";
}

function buildSearchHref(query: string): string {
  return `/search?q=${encodeURIComponent(query)}&original=${encodeURIComponent(query)}`;
}

function getExpandedInfoWidth(card: ScryfallCard): number {
  const setNameLength = card.set_name.length;
  const artistLength = (card.artist ?? "Unknown").length;
  const dominantLength = Math.max(setNameLength, artistLength);

  // Approximate text width and reserve room for padding, labels, and badges.
  const estimatedWidth = Math.ceil(dominantLength * 8.2 + 170);

  return Math.min(
    MAX_EXPANDED_INFO_WIDTH,
    Math.max(MIN_EXPANDED_INFO_WIDTH, estimatedWidth),
  );
}
