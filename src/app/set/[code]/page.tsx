import { getSetByCode } from "@/lib/sets";
import { searchCards } from "@/lib/scryfall";

import Sidebar from "@/components/Sidebar";
import { Suspense } from "react";
import SortableCardGrid from "@/components/SortableCardGrid";
import { getAllSets } from "@/lib/sets";

interface SetPageProps {
  params: Promise<{ code: string }>;
}

export default async function SetPage({ params }: SetPageProps) {
  const { code } = await params;
  const set = await getSetByCode(code);
  const sets = await getAllSets();
  const results = await searchCards(`set:${code}`);

  return (
    <div className="flex min-h-[calc(100vh-57px)]">
      <Suspense
        fallback={
          <div className="w-16 border-r border-card-border" aria-hidden />
        }
      >
        <Sidebar sets={sets} selectedSet={code} />
      </Suspense>
      <div className="flex flex-1 flex-col px-4 py-8">
        <div className="mb-8 flex items-center gap-3">
          <img src={set.icon_svg_uri} alt={set.name} className="h-8 w-8" />
          <h1 className="text-3xl font-bold text-foreground">{set.name}</h1>
          <span className="ml-2 text-sm text-muted">
            ({set.card_count} cards)
          </span>
        </div>
        <SortableCardGrid cards={results.data} />
      </div>
    </div>
  );
}
