"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type WishlistPayload = {
  cardId: string;
  name: string;
  setCode: string;
  setName: string;
  typeLine: string;
  colorIdentity: string[];
  imageUrl?: string;
  scryfallUri?: string;
  cmc?: number;
  usd?: string;
  usdFoil?: string;
  eur?: string;
  tix?: string;
};

export default function WishlistToggleButton({
  initialInWishlist,
  payload,
  isAuthenticated,
}: {
  initialInWishlist: boolean;
  payload: WishlistPayload;
  isAuthenticated: boolean;
}) {
  const router = useRouter();
  const [inWishlist, setInWishlist] = useState(initialInWishlist);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleToggle() {
    if (!isAuthenticated) {
      router.push(
        `/auth/signin?callbackUrl=${encodeURIComponent(`/card/${payload.cardId}`)}`,
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (inWishlist) {
        const response = await fetch(`/api/wishlist/${payload.cardId}`, {
          method: "DELETE",
        });
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(body?.error ?? "Unable to remove card from wishlist");
        }
        setInWishlist(false);
      } else {
        const response = await fetch("/api/wishlist", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(body?.error ?? "Unable to add card to wishlist");
        }

        setInWishlist(true);
      }

      router.refresh();
    } catch (toggleError) {
      setError(
        toggleError instanceof Error
          ? toggleError.message
          : "Wishlist update failed",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={handleToggle}
        disabled={loading}
        title={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
        aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
        className={`group inline-flex h-10 w-10 items-center justify-center rounded-full border transition-all disabled:cursor-not-allowed disabled:opacity-70 ${
          inWishlist
            ? "border-accent/60 bg-accent/20 text-accent hover:bg-accent/25"
            : "border-card-border bg-surface text-muted hover:border-accent/70 hover:bg-accent/10 hover:text-accent"
        }`}
      >
        <span className="sr-only">
          {loading
            ? "Updating wishlist"
            : inWishlist
              ? "Remove from wishlist"
              : "Add to wishlist"}
        </span>
        {loading ? (
          <svg
            className="h-5 w-5 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M12 3a9 9 0 1 0 9 9" />
          </svg>
        ) : (
          <svg
            className={`h-5 w-5 transition-transform group-hover:scale-110 ${
              inWishlist ? "fill-current" : "fill-none"
            }`}
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
          >
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        )}
      </button>

      {error ? <p className="text-xs text-red-400">{error}</p> : null}
    </div>
  );
}
