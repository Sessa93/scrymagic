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
        className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${
          inWishlist
            ? "border border-accent/60 bg-accent/20 text-accent hover:bg-accent/25"
            : "bg-accent text-white hover:bg-accent-hover"
        }`}
      >
        {loading
          ? "Updating..."
          : inWishlist
            ? "Remove from wishlist"
            : "Add to wishlist"}
      </button>

      {error ? <p className="text-xs text-red-400">{error}</p> : null}
    </div>
  );
}
