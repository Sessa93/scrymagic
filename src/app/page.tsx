import { getAllSets } from "@/lib/sets";
import { getRandomCard, type ScryfallCard } from "@/lib/scryfall";
import { Suspense } from "react";
import Sidebar from "@/components/Sidebar";
import SearchBox from "@/components/SearchBox";
import CardGrid from "@/components/CardGrid";

export default async function Home() {
  const [sets, randomCards] = await Promise.all([
    getAllSets(),
    getRandomCards(5),
  ]);

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

        {randomCards.length > 0 ? (
          <div className="mt-24 w-full max-w-7xl border-t border-card-border/40 pt-10">
            <CardGrid cards={randomCards} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

async function getRandomCards(count: number): Promise<ScryfallCard[]> {
  const uniqueCards = new Map<string, ScryfallCard>();

  for (
    let attempts = 0;
    attempts < 3 && uniqueCards.size < count;
    attempts += 1
  ) {
    const remaining = count - uniqueCards.size;
    const batch = await Promise.allSettled(
      Array.from({ length: remaining }, () => getRandomCard()),
    );

    for (const item of batch) {
      if (item.status === "fulfilled") {
        uniqueCards.set(item.value.id, item.value);
      }
    }
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
