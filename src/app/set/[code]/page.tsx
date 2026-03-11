import { getSetByCode } from "@/lib/sets";
import { searchCards } from "@/lib/scryfall";

import Sidebar from "@/components/Sidebar";
import SetInfo from "@/components/SetInfo";
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

  // Find parent set if it exists
  const parentSet = set.parent_set_code
    ? sets.find((s) => s.code === set.parent_set_code)
    : undefined;

  // Find all child sets
  const childSets = sets.filter((s) => s.parent_set_code === set.code);

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
        <SortableCardGrid cards={results.data} />
      </div>
    </div>
  );
}
