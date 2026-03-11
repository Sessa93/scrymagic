import { getSetByCode } from "@/lib/sets";
import { searchCards, ScryfallCard } from "@/lib/scryfall";

import Sidebar from "@/components/Sidebar";
import SetInfo from "@/components/SetInfo";
import { Suspense } from "react";
import SortableCardGrid from "@/components/SortableCardGrid";
import GroupedSortableCardGrid, {
  SetGroup,
} from "@/components/GroupedSortableCardGrid";
import { getAllSets } from "@/lib/sets";

interface SetPageProps {
  params: Promise<{ code: string }>;
}

export default async function SetPage({ params }: SetPageProps) {
  const { code } = await params;
  const set = await getSetByCode(code);
  const sets = await getAllSets();

  // Find parent set if it exists
  const parentSet = set.parent_set_code
    ? sets.find((s) => s.code === set.parent_set_code)
    : undefined;

  // Find all child sets sorted by release date
  const childSets = sets
    .filter((s) => s.parent_set_code === set.code)
    .sort((a, b) => (a.released_at ?? "").localeCompare(b.released_at ?? ""));

  let groupedCards: SetGroup[] | null = null;
  let ownCards: ScryfallCard[] = [];

  if (childSets.length > 0) {
    // Fetch parent's own cards + each child set's cards in parallel
    const fetches = await Promise.all([
      searchCards(`set:${code}`).catch(() => ({ data: [] as ScryfallCard[] })),
      ...childSets.map((child) =>
        searchCards(`set:${child.code}`).catch(() => ({
          data: [] as ScryfallCard[],
        })),
      ),
    ]);

    const groups: SetGroup[] = [];
    if (fetches[0].data.length > 0) {
      groups.push({ set, cards: fetches[0].data });
    }
    childSets.forEach((child, i) => {
      if (fetches[i + 1].data.length > 0) {
        groups.push({ set: child, cards: fetches[i + 1].data });
      }
    });
    groupedCards = groups;
  } else {
    const results = await searchCards(`set:${code}`);
    ownCards = results.data;
  }

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
        <SetInfo set={set} parentSet={parentSet} childSets={childSets} />
        {groupedCards ? (
          <GroupedSortableCardGrid groups={groupedCards} />
        ) : (
          <SortableCardGrid cards={ownCards} />
        )}
      </div>
    </div>
  );
}
