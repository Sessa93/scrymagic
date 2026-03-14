"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

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
  const [removing, setRemoving] = useState<string | null>(null);

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

        <div className="flex items-center gap-2 rounded-lg border border-card-border bg-card-bg p-2">
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
      ) : (
        <div className="space-y-6">
          {groupedItems.map((group) => (
            <section
              key={group.label}
              className="rounded-xl border border-card-border bg-card-bg p-4"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">{group.label}</h2>
                <span className="text-xs uppercase tracking-wide text-muted">
                  {group.items.length} cards
                </span>
              </div>

              <div className="space-y-2">
                {group.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-center gap-3 rounded-lg border border-card-border/70 bg-surface p-2"
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
            </section>
          ))}
        </div>
      )}
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
