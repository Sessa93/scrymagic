"use client";

import { useMemo, useState } from "react";
import CardGrid from "@/components/CardGrid";
import type { ScryfallCard } from "@/lib/scryfall";

type SortMode = "number" | "rarity" | "colorType";

const RARITY_ORDER: Record<string, number> = {
  mythic: 0,
  rare: 1,
  uncommon: 2,
  common: 3,
};

const COLOR_ORDER = ["W", "U", "B", "R", "G"];

function parseCollectorNumber(raw?: string): { n: number; suffix: string } {
  if (!raw) return { n: Number.MAX_SAFE_INTEGER, suffix: "" };
  const trimmed = raw.trim().toLowerCase();
  const match = trimmed.match(/^(\d+)([a-z]*)/);
  if (!match) return { n: Number.MAX_SAFE_INTEGER, suffix: trimmed };
  return { n: parseInt(match[1], 10), suffix: match[2] || "" };
}

function rarityRank(rarity?: string): number {
  if (!rarity) return 99;
  return RARITY_ORDER[rarity] ?? 50;
}

function colorKey(card: ScryfallCard): string {
  const colors = card.color_identity?.length
    ? card.color_identity
    : card.colors || [];
  if (!colors.length) return "0";

  const ordered = COLOR_ORDER.filter((c) => colors.includes(c));
  return `${ordered.length}-${ordered.join("")}`;
}

function primaryType(typeLine?: string): string {
  if (!typeLine) return "zzzz";
  return typeLine.split("-")[0].trim().toLowerCase();
}

export default function SortableCardGrid({ cards }: { cards: ScryfallCard[] }) {
  const [sortMode, setSortMode] = useState<SortMode>("number");

  const sortedCards = useMemo(() => {
    const cloned = [...cards];

    if (sortMode === "number") {
      cloned.sort((a, b) => {
        const an = parseCollectorNumber(a.collector_number);
        const bn = parseCollectorNumber(b.collector_number);
        if (an.n !== bn.n) return an.n - bn.n;
        if (an.suffix !== bn.suffix) return an.suffix.localeCompare(bn.suffix);
        return a.name.localeCompare(b.name);
      });
      return cloned;
    }

    if (sortMode === "rarity") {
      cloned.sort((a, b) => {
        const rr = rarityRank(a.rarity) - rarityRank(b.rarity);
        if (rr !== 0) return rr;
        const an = parseCollectorNumber(a.collector_number);
        const bn = parseCollectorNumber(b.collector_number);
        if (an.n !== bn.n) return an.n - bn.n;
        return a.name.localeCompare(b.name);
      });
      return cloned;
    }

    cloned.sort((a, b) => {
      const ck = colorKey(a).localeCompare(colorKey(b));
      if (ck !== 0) return ck;
      const tk = primaryType(a.type_line).localeCompare(
        primaryType(b.type_line),
      );
      if (tk !== 0) return tk;
      return a.name.localeCompare(b.name);
    });
    return cloned;
  }, [cards, sortMode]);

  const buttonBase =
    "rounded-sm border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted">
          Sort by
        </span>
        <button
          type="button"
          className={`${buttonBase} ${
            sortMode === "number"
              ? "border-accent bg-accent/25 text-foreground"
              : "border-card-border bg-surface text-muted hover:text-foreground"
          }`}
          onClick={() => setSortMode("number")}
        >
          Card Number
        </button>
        <button
          type="button"
          className={`${buttonBase} ${
            sortMode === "rarity"
              ? "border-accent bg-accent/25 text-foreground"
              : "border-card-border bg-surface text-muted hover:text-foreground"
          }`}
          onClick={() => setSortMode("rarity")}
        >
          Rarity
        </button>
        <button
          type="button"
          className={`${buttonBase} ${
            sortMode === "colorType"
              ? "border-accent bg-accent/25 text-foreground"
              : "border-card-border bg-surface text-muted hover:text-foreground"
          }`}
          onClick={() => setSortMode("colorType")}
        >
          Color / Type
        </button>
      </div>

      <CardGrid cards={sortedCards} />
    </div>
  );
}
