import { getAllSets } from "@/lib/sets";
import { getRandomCard, type ScryfallCard } from "@/lib/scryfall";
import { Suspense } from "react";
import Sidebar from "@/components/Sidebar";
import SearchBox from "@/components/SearchBox";
import CardGrid from "@/components/CardGrid";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import {
  getOracleRecommendations,
  getVisualRecommendations,
  type RecommendedCard,
} from "@/lib/recommender";
import { getCachedCardById } from "@/lib/scryfall-server";
import {
  getCachedWishlistRecommendations,
  setCachedWishlistRecommendations,
} from "@/lib/wishlist-recommendations-cache";

export default async function Home() {
  const sets = await getAllSets();

  return (
    <div className="flex min-h-[calc(100vh-57px)]">
      <Suspense
        fallback={
          <div className="w-16 border-r border-card-border" aria-hidden />
        }
      >
        <Sidebar sets={sets} />
      </Suspense>
      <div className="flex flex-1 flex-col items-center px-4 py-10">
        <div className="w-full max-w-3xl text-center">
          <div className="mb-8">
            <h1 className="mb-2 text-5xl font-bold tracking-tight">
              <span className="text-accent">Scry</span>Magic
            </h1>
            <p className="text-lg text-muted">
              Search the multiverse of Magic: The Gathering cards
            </p>
          </div>
          <SearchBox />
          <div className="mt-16 grid grid-cols-2 gap-8 text-center sm:grid-cols-4">
            <Stat label="Cards" value="30,000+" />
            <Stat label="Sets" value="800+" />
            <Stat label="Artists" value="1,500+" />
            <Stat label="Formats" value="12+" />
          </div>
        </div>

        <Suspense fallback={null}>
          <WishlistRecommendationsSection />
        </Suspense>

        <Suspense
          fallback={
            <RecommendationSectionSkeleton
              title="You might also like..."
              className="mt-24"
            />
          }
        >
          <RandomRecommendationsSection />
        </Suspense>
      </div>
    </div>
  );
}

async function WishlistRecommendationsSection() {
  const session = await getServerSession(authOptions);
  const wishlistRecommendations = session?.user?.id
    ? await getWishlistRecommendationsForUser(session.user.id)
    : [];

  if (!wishlistRecommendations.length) {
    return null;
  }

  return (
    <div className="mt-20 w-full max-w-7xl border-t border-card-border/40 pt-10">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-muted">
        Based on your wishlist...
      </h2>
      <CardGrid cards={wishlistRecommendations} />
    </div>
  );
}

async function RandomRecommendationsSection() {
  const randomCards = await getRandomCards(7);

  if (!randomCards.length) {
    return null;
  }

  return (
    <div className="mt-24 w-full max-w-7xl border-t border-card-border/40 pt-10">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-muted">
        You might also like...
      </h2>
      <CardGrid cards={randomCards} />
    </div>
  );
}

async function getRandomCards(count: number): Promise<ScryfallCard[]> {
  const uniqueCards = new Map<string, ScryfallCard>();
  const MAX_ATTEMPTS = 10;

  for (
    let attempt = 0;
    attempt < MAX_ATTEMPTS && uniqueCards.size < count;
    attempt += 1
  ) {
    const card = await getRandomCard().catch(() => null);
    if (!card) continue;
    uniqueCards.set(card.id, card);
  }

  return Array.from(uniqueCards.values()).slice(0, count);
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-2xl font-bold text-accent">{value}</div>
      <div className="text-sm text-muted">{label}</div>
    </div>
  );
}

function RecommendationSectionSkeleton({
  title,
  className,
}: {
  title: string;
  className: string;
}) {
  return (
    <div
      className={`${className} w-full max-w-7xl border-t border-card-border/40 pt-10`}
    >
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-muted">
        {title}
      </h2>
      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
        {Array.from({ length: 7 }).map((_, index) => (
          <div key={index} className="animate-pulse overflow-hidden rounded-lg">
            <div className="aspect-488/680 w-full bg-surface" />
            <div className="space-y-2 p-2">
              <div className="h-3 rounded bg-surface" />
              <div className="h-2.5 w-2/3 rounded bg-surface/80" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

async function getWishlistRecommendationsForUser(
  userId: string,
): Promise<ScryfallCard[]> {
  const cachedRecommendations = await getCachedWishlistRecommendations(userId);
  if (cachedRecommendations) {
    return cachedRecommendations;
  }

  const TARGET_RECOMMENDATIONS = 7;
  const INITIAL_SEED_SAMPLE_SIZE = 10;
  const MAX_REFILL_ATTEMPTS = 24;

  const wishlistItems = await prisma.wishlistItem.findMany({
    where: { userId },
    select: { cardId: true },
  });

  if (!wishlistItems.length) {
    return [];
  }

  const sampledWishlistCardIds = sampleRandom(
    wishlistItems.map((item) => item.cardId),
    INITIAL_SEED_SAMPLE_SIZE,
  );

  const sampledCards = await Promise.all(
    sampledWishlistCardIds.map((cardId) =>
      getCachedCardById(cardId).catch(() => null),
    ),
  );

  const validCards = sampledCards.filter((card): card is ScryfallCard =>
    Boolean(card),
  );

  if (!validCards.length) {
    return [];
  }

  const recommendationBatches = await Promise.all(
    validCards.map(async (card) => {
      const oracleQuery = getOracleQuery(card);

      const [visual, oracle] = await Promise.all([
        getVisualRecommendations(card.id, 1).catch(() => []),
        oracleQuery
          ? getOracleRecommendations(oracleQuery, card.id, 1).catch(() => [])
          : Promise.resolve([]),
      ]);

      return [
        visual.find((candidate) => candidate.card_id !== card.id),
        oracle.find((candidate) => candidate.card_id !== card.id),
      ].filter((candidate): candidate is RecommendedCard => Boolean(candidate));
    }),
  );

  const candidatePool = recommendationBatches.flat();
  if (!candidatePool.length) {
    return [];
  }

  const recommendationMap = new Map<string, RecommendedCard>(
    candidatePool.map((candidate) => [candidate.card_id, candidate]),
  );

  let refillAttempts = 0;
  while (
    recommendationMap.size < TARGET_RECOMMENDATIONS &&
    refillAttempts < MAX_REFILL_ATTEMPTS
  ) {
    refillAttempts += 1;

    const seedCardId = pickRandom(wishlistItems.map((item) => item.cardId));

    if (!seedCardId) {
      break;
    }

    const seedCard = await getCachedCardById(seedCardId).catch(() => null);
    if (!seedCard) {
      continue;
    }

    const oracleQuery = getOracleQuery(seedCard);
    const [visual, oracle] = await Promise.all([
      getVisualRecommendations(seedCard.id, 1).catch(() => []),
      oracleQuery
        ? getOracleRecommendations(oracleQuery, seedCard.id, 1).catch(() => [])
        : Promise.resolve([]),
    ]);

    const refillCandidate =
      visual.find(
        (candidate) =>
          candidate.card_id !== seedCard.id &&
          !recommendationMap.has(candidate.card_id),
      ) ??
      oracle.find(
        (candidate) =>
          candidate.card_id !== seedCard.id &&
          !recommendationMap.has(candidate.card_id),
      );

    if (refillCandidate) {
      recommendationMap.set(refillCandidate.card_id, refillCandidate);
    }
  }

  const sampledRecommendations = sampleRandom(
    Array.from(recommendationMap.values()),
    TARGET_RECOMMENDATIONS,
  );

  const initialRecommendedCards = await Promise.all(
    sampledRecommendations.map((candidate) =>
      getCachedCardById(candidate.card_id).catch(() => null),
    ),
  );

  const uniqueCards = new Map<string, ScryfallCard>();
  for (const card of initialRecommendedCards) {
    if (!card) {
      continue;
    }
    uniqueCards.set(card.id, card);
  }

  let finalFillAttempts = 0;
  const MAX_FINAL_FILL_ATTEMPTS = 30;
  while (
    uniqueCards.size < TARGET_RECOMMENDATIONS &&
    finalFillAttempts < MAX_FINAL_FILL_ATTEMPTS
  ) {
    finalFillAttempts += 1;

    const seedCardId = pickRandom(wishlistItems.map((item) => item.cardId));
    if (!seedCardId) {
      break;
    }

    const seedCard = await getCachedCardById(seedCardId).catch(() => null);
    if (!seedCard) {
      continue;
    }

    const oracleQuery = getOracleQuery(seedCard);
    const [visual, oracle] = await Promise.all([
      getVisualRecommendations(seedCard.id, 1).catch(() => []),
      oracleQuery
        ? getOracleRecommendations(oracleQuery, seedCard.id, 1).catch(() => [])
        : Promise.resolve([]),
    ]);

    const refillCandidate =
      visual.find((candidate) => candidate.card_id !== seedCard.id) ??
      oracle.find((candidate) => candidate.card_id !== seedCard.id);

    if (!refillCandidate || uniqueCards.has(refillCandidate.card_id)) {
      continue;
    }

    const resolvedCard = await getCachedCardById(refillCandidate.card_id).catch(
      () => null,
    );

    if (resolvedCard) {
      uniqueCards.set(resolvedCard.id, resolvedCard);
    }
  }

  const recommendations = Array.from(uniqueCards.values()).slice(
    0,
    TARGET_RECOMMENDATIONS,
  );

  await setCachedWishlistRecommendations(userId, recommendations);

  return recommendations;
}

function getOracleQuery(card: ScryfallCard): string | null {
  const oracleText =
    card.oracle_text ||
    card.card_faces
      ?.map((face) => face.oracle_text)
      .filter(Boolean)
      .join("\n\n") ||
    "";

  const query = oracleText.trim();
  return query.length > 0 ? query : null;
}

function sampleRandom<T>(items: T[], count: number): T[] {
  if (!items.length || count <= 0) {
    return [];
  }

  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[i]];
  }

  return shuffled.slice(0, Math.min(count, shuffled.length));
}

function pickRandom<T>(items: T[]): T | null {
  if (!items.length) {
    return null;
  }

  const randomIndex = Math.floor(Math.random() * items.length);
  return items[randomIndex] ?? null;
}
