
import { getAllSets } from "@/lib/sets";
import { Suspense } from "react";
import Sidebar from "@/components/Sidebar";
import SearchBox from "@/components/SearchBox";

export default async function Home() {
  const sets = await getAllSets();

  return (
    <div className="flex min-h-[calc(100vh-57px)]">
      <Suspense fallback={<div className="w-16 border-r border-card-border" aria-hidden />}> 
        <Sidebar sets={sets} />
      </Suspense>
      <div className="flex flex-1 flex-col items-center justify-center px-4">
        <div className="mb-8 text-center">
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
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-2xl font-bold text-accent">{value}</div>
      <div className="text-sm text-muted">{label}</div>
    </div>
  );
}
