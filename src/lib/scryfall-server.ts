import "server-only";

import { getJsonFromRedis, setJsonInRedis } from "@/lib/redis";
import { scryfall, type ScryfallCard } from "@/lib/scryfall";

const CARD_CACHE_PREFIX = "cards:";
const ONE_WEEK_IN_SECONDS = 60 * 60 * 24 * 7;

export async function getCachedCardById(id: string): Promise<ScryfallCard> {
  const cacheKey = `${CARD_CACHE_PREFIX}${id}`;
  const cachedCard = await getJsonFromRedis<ScryfallCard>(cacheKey);

  if (cachedCard) {
    return cachedCard;
  }

  const card = await scryfall<ScryfallCard>(`/cards/${id}`);
  await setJsonInRedis(cacheKey, card, ONE_WEEK_IN_SECONDS);

  return card;
}
