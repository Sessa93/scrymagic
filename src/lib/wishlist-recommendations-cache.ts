import "server-only";

import { deleteRedisKey, getJsonFromRedis, setJsonInRedis } from "@/lib/redis";
import type { ScryfallCard } from "@/lib/scryfall";

const WISHLIST_RECOMMENDATIONS_CACHE_PREFIX = "wishlist-recommendations:user:";
const ONE_WEEK_IN_SECONDS = 60 * 60 * 24 * 7;

function getWishlistRecommendationsCacheKey(userId: string): string {
  return `${WISHLIST_RECOMMENDATIONS_CACHE_PREFIX}${userId}`;
}

export async function getCachedWishlistRecommendations(
  userId: string,
): Promise<ScryfallCard[] | null> {
  return getJsonFromRedis<ScryfallCard[]>(
    getWishlistRecommendationsCacheKey(userId),
  );
}

export async function setCachedWishlistRecommendations(
  userId: string,
  cards: ScryfallCard[],
): Promise<void> {
  await setJsonInRedis(
    getWishlistRecommendationsCacheKey(userId),
    cards,
    ONE_WEEK_IN_SECONDS,
  );
}

export async function invalidateWishlistRecommendationsCache(
  userId: string,
): Promise<void> {
  await deleteRedisKey(getWishlistRecommendationsCacheKey(userId));
}
