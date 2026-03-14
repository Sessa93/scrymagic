"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import BackToResultsButton from "@/components/BackToResultsButton";
import ManaSymbol from "@/components/ManaSymbol";
import RarityBadge from "@/components/RarityBadge";
import ScryfallText, {
  buildSymbolDictionary,
  type ScryfallSymbolDictionary,
} from "@/components/ScryfallText";
import {
  formatManaCost,
  getCardImage,
  getCardSymbols,
  type ScryfallCard,
} from "@/lib/scryfall";

type WishlistItem = {
  id: string;
  cardId: string;
  name: string;
  setCode: string;
  setName: string;
  typeLine: string;
  colorIdentity: string[];
  imageUrl: string | null;
  scryfallUri: string | null;
  cmc: number | null;
  usd: string | null;
  usdFoil: string | null;
  eur: string | null;
  tix: string | null;
  addedAt: string;
};

type GroupBy = "set" | "color" | "type";
type ViewMode = "grid" | "list";

interface HoverPreviewState {
  item: WishlistItem;
  card: ScryfallCard | null;
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

function parsePrice(value: string | null): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function primaryType(typeLine: string): string {
  return typeLine.split(/\u2014|-/)[0]?.trim() || "Other";
}

function formatMoney(value: number, currency: "USD" | "EUR"): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function groupLabel(item: WishlistItem, groupBy: GroupBy): string {
  if (groupBy === "set") {
    return `${item.setName} (${item.setCode.toUpperCase()})`;
  }

  if (groupBy === "type") {
    return primaryType(item.typeLine);
  }

  if (!item.colorIdentity.length) {
    return "Colorless";
  }

  if (item.colorIdentity.length > 1) {
    return `Multicolor (${item.colorIdentity.join("")})`;
  }

  const map: Record<string, string> = {
    W: "White",
    U: "Blue",
    B: "Black",
    R: "Red",
    G: "Green",
  };
  return map[item.colorIdentity[0]] ?? item.colorIdentity[0];
}

export default function WishlistPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [maxItems, setMaxItems] = useState<number>(1000);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState<GroupBy>("set");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    () => new Set(),
  );
  const [removing, setRemoving] = useState<string | null>(null);
  const [preview, setPreview] = useState<HoverPreviewState | null>(null);
  const [symbolDictionary, setSymbolDictionary] =
    useState<ScryfallSymbolDictionary>({});
  const cardCacheRef = useRef(new Map<string, ScryfallCard>());
  const pendingPreviewRequestsRef = useRef(
    new Map<string, Promise<ScryfallCard>>(),
  );
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

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth/signin?callbackUrl=%2Fwishlist");
    }
  }, [router, status]);

  useEffect(() => {
    if (status !== "authenticated") {
      return;
    }

    setLoading(true);
    fetch("/api/wishlist")
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as {
          items?: WishlistItem[];
          maxItems?: number;
          error?: string;
        } | null;

        if (!response.ok || !payload?.items) {
          throw new Error(payload?.error ?? "Unable to load wishlist");
        }

        setItems(payload.items);
        setMaxItems(payload.maxItems ?? 1000);
      })
      .catch((requestError) => {
        const message =
          requestError instanceof Error
            ? requestError.message
            : "Unable to load wishlist";
        setError(message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [status]);

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

  const stats = useMemo(() => {
    const totalUsd = items.reduce((sum, item) => sum + parsePrice(item.usd), 0);
    const totalUsdFoil = items.reduce(
      (sum, item) => sum + parsePrice(item.usdFoil),
      0,
    );
    const totalEur = items.reduce((sum, item) => sum + parsePrice(item.eur), 0);
    const uniqueSets = new Set(items.map((item) => item.setCode)).size;
    const uniqueTypes = new Set(items.map((item) => primaryType(item.typeLine)))
      .size;

    return {
      totalCards: items.length,
      uniqueSets,
      uniqueTypes,
      totalUsd,
      totalUsdFoil,
      totalEur,
      avgUsd: items.length ? totalUsd / items.length : 0,
    };
  }, [items]);

  const groupedItems = useMemo(() => {
    const groups = new Map<string, WishlistItem[]>();

    for (const item of items) {
      const key = groupLabel(item, groupBy);
      const current = groups.get(key);
      if (current) {
        current.push(item);
      } else {
        groups.set(key, [item]);
      }
    }

    return Array.from(groups.entries())
      .map(([label, groupItems]) => ({
        label,
        items: groupItems.sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .sort(
        (a, b) =>
          b.items.length - a.items.length || a.label.localeCompare(b.label),
      );
  }, [groupBy, items]);

  async function removeItem(cardId: string) {
    setRemoving(cardId);
    try {
      const response = await fetch(`/api/wishlist/${cardId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error ?? "Unable to remove card");
      }
      setItems((current) => current.filter((item) => item.cardId !== cardId));
      router.refresh();
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : "Unable to remove card",
      );
    } finally {
      setRemoving(null);
    }
  }

  function toggleGroup(label: string) {
    setCollapsedGroups((current) => {
      const next = new Set(current);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  }

  async function loadPreviewCard(cardId: string) {
    const cached = cardCacheRef.current.get(cardId);
    if (cached) {
      return cached;
    }

    const pending = pendingPreviewRequestsRef.current.get(cardId);
    if (pending) {
      return pending;
    }

    const request = fetch(`/api/card-preview/${cardId}`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Unable to load card preview");
        }
        return (await response.json()) as ScryfallCard;
      })
      .then((card) => {
        cardCacheRef.current.set(cardId, card);
        pendingPreviewRequestsRef.current.delete(cardId);
        return card;
      })
      .catch((previewError) => {
        pendingPreviewRequestsRef.current.delete(cardId);
        throw previewError;
      });

    pendingPreviewRequestsRef.current.set(cardId, request);
    return request;
  }

  function handleHoverStart(e: React.MouseEvent, item: WishlistItem) {
    if (!item.imageUrl) {
      return;
    }

    clearTimers();
    cancelHide();

    pointerRef.current = { x: e.clientX, y: e.clientY };

    const cachedCard = cardCacheRef.current.get(item.cardId) ?? null;
    const infoWidth = cachedCard
      ? getExpandedInfoWidth(cachedCard)
      : getFallbackPreviewWidth(item);
    const pos = clampPreviewPosition(e.clientX, e.clientY, false, infoWidth);

    setPreview({
      item,
      card: cachedCard,
      imageUrl: cachedCard
        ? getCardImage(cachedCard, "png") || item.imageUrl
        : item.imageUrl,
      infoWidth,
      x: pos.x,
      y: pos.y,
      visible: false,
      expanded: false,
    });

    void loadPreviewCard(item.cardId)
      .then((card) => {
        setPreview((prev) => {
          if (!prev || prev.item.cardId !== item.cardId) {
            return prev;
          }

          const nextInfoWidth = getExpandedInfoWidth(card);
          const nextPos = clampPreviewPosition(
            pointerRef.current.x,
            pointerRef.current.y,
            prev.expanded,
            nextInfoWidth,
          );

          return {
            ...prev,
            card,
            imageUrl: getCardImage(card, "png") || prev.imageUrl,
            infoWidth: nextInfoWidth,
            x: nextPos.x,
            y: nextPos.y,
          };
        });
      })
      .catch(() => undefined);

    showTimerRef.current = window.setTimeout(() => {
      setPreview((prev) =>
        prev ? { ...prev, visible: true, expanded: false } : prev,
      );

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
  }

  function handleHoverMove(e: React.MouseEvent) {
    pointerRef.current = { x: e.clientX, y: e.clientY };
    setPreview((prev) => {
      if (!prev) {
        return prev;
      }

      const pos = clampPreviewPosition(
        e.clientX,
        e.clientY,
        prev.expanded,
        prev.infoWidth,
      );

      return { ...prev, x: pos.x, y: pos.y };
    });
  }

  function handleHoverEnd() {
    if (showTimerRef.current !== null) {
      window.clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }

    if (expandTimerRef.current !== null) {
      window.clearTimeout(expandTimerRef.current);
      expandTimerRef.current = null;
    }

    scheduleHide();
  }

  function handlePreviewEnter() {
    cancelHide();
  }

  function handlePreviewLeave() {
    scheduleHide();
  }

  function handlePreviewTransitionEnd() {
    setPreview((prev) => {
      if (!prev || prev.visible) {
        return prev;
      }

      return null;
    });
  }

  if (status === "loading" || loading) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-10">
        <p className="text-sm text-muted">Loading wishlist...</p>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10">
      <BackToResultsButton />

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Your Wishlist</h1>
          <p className="mt-1 text-sm text-muted">
            {session?.user?.username ??
              session?.user?.name ??
              session?.user?.email}
            {" - "}
            {items.length}/{maxItems} cards
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-card-border bg-card-bg p-2">
          <div className="flex items-center gap-2 rounded-lg border border-card-border/70 bg-surface px-2 py-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">
              View
            </span>
            {(["grid", "list"] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={`rounded-sm px-3 py-1 text-xs font-semibold uppercase tracking-wide transition-colors ${
                  viewMode === mode
                    ? "bg-accent/25 text-foreground"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-card-border/70 bg-surface px-2 py-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">
              Group by
            </span>
            {(["set", "color", "type"] as GroupBy[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setGroupBy(mode)}
                className={`rounded-sm px-3 py-1 text-xs font-semibold uppercase tracking-wide transition-colors ${
                  groupBy === mode
                    ? "bg-accent/25 text-foreground"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        <StatCard label="Cards" value={String(stats.totalCards)} />
        <StatCard label="Sets" value={String(stats.uniqueSets)} />
        <StatCard label="Types" value={String(stats.uniqueTypes)} />
        <StatCard
          label="Total USD"
          value={formatMoney(stats.totalUsd, "USD")}
        />
        <StatCard
          label="Total USD Foil"
          value={formatMoney(stats.totalUsdFoil, "USD")}
        />
        <StatCard
          label="Total EUR"
          value={formatMoney(stats.totalEur, "EUR")}
        />
        <StatCard label="Avg USD" value={formatMoney(stats.avgUsd, "USD")} />
      </div>

      {error ? (
        <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      {items.length === 0 ? (
        <div className="rounded-xl border border-card-border bg-card-bg p-8 text-center">
          <p className="text-foreground">Your wishlist is empty.</p>
          <p className="mt-2 text-sm text-muted">
            Add cards from any card details page using the wishlist button.
          </p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="space-y-6">
          {groupedItems.map((group) => (
            <section
              key={group.label}
              className="rounded-xl border border-card-border bg-card-bg p-4"
            >
              <button
                type="button"
                onClick={() => toggleGroup(group.label)}
                aria-expanded={!collapsedGroups.has(group.label)}
                className="mb-3 flex w-full items-center justify-between gap-3 text-left"
              >
                <span className="flex items-center gap-2">
                  <svg
                    className={`h-4 w-4 text-muted transition-transform ${
                      collapsedGroups.has(group.label)
                        ? "-rotate-90"
                        : "rotate-0"
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                  <h2 className="text-lg font-semibold">{group.label}</h2>
                </span>
                <span className="text-xs uppercase tracking-wide text-muted">
                  {group.items.length} cards
                </span>
              </button>

              {collapsedGroups.has(group.label) ? null : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {group.items.map((item) => (
                    <article
                      key={item.id}
                      className="flex h-full flex-col rounded-xl border border-card-border/70 bg-surface p-4"
                      onMouseEnter={(e) => handleHoverStart(e, item)}
                      onMouseMove={handleHoverMove}
                      onMouseLeave={handleHoverEnd}
                    >
                      <Link
                        href={`/card/${item.cardId}`}
                        className="flex min-h-0 flex-1 gap-4"
                      >
                        <div className="h-28 w-20 shrink-0 overflow-hidden rounded bg-surface-elevated">
                          {item.imageUrl ? (
                            <Image
                              src={item.imageUrl}
                              alt={item.name}
                              width={80}
                              height={112}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[10px] text-muted">
                              N/A
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-base font-semibold text-foreground">
                            {item.name}
                          </p>
                          <p className="mt-1 text-xs uppercase tracking-wide text-muted">
                            {item.setName} ({item.setCode.toUpperCase()})
                          </p>
                          <p className="mt-2 line-clamp-3 text-sm text-muted">
                            {item.typeLine}
                          </p>
                        </div>
                      </Link>

                      <div className="mt-4 flex items-center justify-between gap-3 border-t border-card-border/70 pt-3">
                        <div className="flex flex-wrap gap-x-3 gap-y-1">
                          <PriceTag label="USD" value={item.usd} />
                          <PriceTag label="Foil" value={item.usdFoil} />
                        </div>
                        <button
                          type="button"
                          disabled={removing === item.cardId}
                          onClick={() => removeItem(item.cardId)}
                          className="rounded-sm border border-red-500/40 px-2 py-1 text-xs text-red-300 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {removing === item.cardId ? "Removing..." : "Remove"}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {groupedItems.map((group) => (
            <section
              key={group.label}
              className="rounded-xl border border-card-border bg-card-bg p-4"
            >
              <button
                type="button"
                onClick={() => toggleGroup(group.label)}
                aria-expanded={!collapsedGroups.has(group.label)}
                className="mb-3 flex w-full items-center justify-between gap-3 text-left"
              >
                <span className="flex items-center gap-2">
                  <svg
                    className={`h-4 w-4 text-muted transition-transform ${
                      collapsedGroups.has(group.label)
                        ? "-rotate-90"
                        : "rotate-0"
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                  <h2 className="text-lg font-semibold">{group.label}</h2>
                </span>
                <span className="text-xs uppercase tracking-wide text-muted">
                  {group.items.length} cards
                </span>
              </button>

              {collapsedGroups.has(group.label) ? null : (
                <div className="space-y-2">
                  {group.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-wrap items-center gap-3 rounded-lg border border-card-border/70 bg-surface p-2"
                      onMouseEnter={(e) => handleHoverStart(e, item)}
                      onMouseMove={handleHoverMove}
                      onMouseLeave={handleHoverEnd}
                    >
                      <Link
                        href={`/card/${item.cardId}`}
                        className="flex min-w-0 flex-1 items-center gap-3"
                      >
                        <div className="h-14 w-10 shrink-0 overflow-hidden rounded bg-surface-elevated">
                          {item.imageUrl ? (
                            <Image
                              src={item.imageUrl}
                              alt={item.name}
                              width={40}
                              height={56}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[10px] text-muted">
                              N/A
                            </div>
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">
                            {item.name}
                          </p>
                          <p className="truncate text-xs text-muted">
                            {item.setName} ({item.setCode.toUpperCase()}) -{" "}
                            {item.typeLine}
                          </p>
                        </div>
                      </Link>

                      <div className="flex items-center gap-3">
                        <PriceTag label="USD" value={item.usd} />
                        <PriceTag label="Foil" value={item.usdFoil} />
                        <button
                          type="button"
                          disabled={removing === item.cardId}
                          onClick={() => removeItem(item.cardId)}
                          className="rounded-sm border border-red-500/40 px-2 py-1 text-xs text-red-300 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {removing === item.cardId ? "Removing..." : "Remove"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      )}

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
                alt={preview.item.name}
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
              <WishlistExpandedPreviewContent
                item={preview.item}
                card={preview.card}
                symbols={symbolDictionary}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-card-border bg-card-bg px-3 py-2">
      <p className="text-xs uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function PriceTag({ label, value }: { label: string; value: string | null }) {
  if (!value) {
    return <span className="text-xs text-muted">{label}: -</span>;
  }

  return (
    <span className="text-xs text-muted">
      {label}: <span className="text-foreground">${value}</span>
    </span>
  );
}

function WishlistExpandedPreviewContent({
  item,
  card,
  symbols,
}: {
  item: WishlistItem;
  card: ScryfallCard | null;
  symbols: ScryfallSymbolDictionary;
}) {
  if (!card) {
    return (
      <div className="flex h-full min-w-0 flex-col">
        <div className="mb-3 space-y-2">
          <h3 className="truncate text-base font-semibold text-foreground">
            {item.name}
          </h3>
          <p className="text-xs leading-relaxed text-muted">{item.typeLine}</p>
          <div className="inline-flex items-center rounded-sm border border-card-border/60 bg-surface/70 px-2 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
            {item.setCode.toUpperCase()}
          </div>
        </div>

        <div className="mb-3 rounded-sm border border-card-border/40 bg-surface/35 px-3 py-2.5 text-[13px] leading-5 text-foreground/82">
          Loading card preview...
        </div>

        <div className="mt-auto grid grid-cols-2 gap-2 text-xs">
          <PreviewStat label="Price" value={getWishlistPreviewPrice(item)} />
          <PreviewStat label="Mana Value" value={item.cmc?.toString() ?? "-"} />
          <PreviewStat label="Set" value={item.setName} />
          <PreviewStat
            label="Added"
            value={new Date(item.addedAt).toLocaleDateString()}
          />
        </div>
      </div>
    );
  }

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
    item.typeLine;
  const statLine = getPreviewStatLine(card);
  const previewPrice = getPreviewPrice(card);
  const setHref = buildSearchHref(`set:${card.set}`);
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
          <RarityBadge
            rarity={card.rarity}
            setCode={card.set}
            setName={card.set_name}
            compact
          />
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

function getWishlistPreviewPrice(item: WishlistItem): string {
  if (item.usd) {
    return `$${item.usd}`;
  }

  if (item.usdFoil) {
    return `$${item.usdFoil} foil`;
  }

  if (item.eur) {
    return `EUR ${item.eur}`;
  }

  if (item.tix) {
    return `${item.tix} tix`;
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
  const estimatedWidth = Math.ceil(dominantLength * 8.2 + 170);

  return Math.min(
    MAX_EXPANDED_INFO_WIDTH,
    Math.max(MIN_EXPANDED_INFO_WIDTH, estimatedWidth),
  );
}

function getFallbackPreviewWidth(item: WishlistItem): number {
  const dominantLength = Math.max(item.setName.length, item.name.length);
  const estimatedWidth = Math.ceil(dominantLength * 8.2 + 170);

  return Math.min(
    MAX_EXPANDED_INFO_WIDTH,
    Math.max(MIN_EXPANDED_INFO_WIDTH, estimatedWidth),
  );
}
