import { searchCards } from "@/lib/scryfall";
import CardGrid from "@/components/CardGrid";
import Link from "next/link";

interface SearchPageProps {
  searchParams: Promise<{ q?: string; page?: string }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = params.q || "";
  const page = parseInt(params.page || "1", 10);

  if (!query) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center">
        <p className="text-lg text-muted">
          Enter a search query to find Magic cards.
        </p>
      </div>
    );
  }

  const results = await searchCards(query, page).catch(() => null);

  if (!results) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center">
        <div className="rounded-xl border border-card-border bg-card-bg p-8">
          <h2 className="mb-2 text-xl font-semibold text-foreground">
            No cards found
          </h2>
          <p className="text-muted">
            No cards match &ldquo;{query}&rdquo;. Try a different search term or
            check the{" "}
            <a
              href="https://scryfall.com/docs/syntax"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              search syntax guide
            </a>
            .
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">
          <span className="text-muted">Results for</span>{" "}
          <span className="text-foreground">&ldquo;{query}&rdquo;</span>
          <span className="ml-2 text-sm font-normal text-muted">
            ({results.total_cards.toLocaleString()} cards)
          </span>
        </h1>
      </div>

      <CardGrid cards={results.data} />

      {/* Pagination */}
      <div className="mt-8 flex items-center justify-center gap-4 pb-8">
        {page > 1 && (
          <Link
            href={`/search?q=${encodeURIComponent(query)}&page=${page - 1}`}
            className="rounded-lg border border-card-border bg-card-bg px-4 py-2 text-sm font-medium text-foreground hover:border-accent transition-colors"
          >
            &larr; Previous
          </Link>
        )}
        <span className="text-sm text-muted">Page {page}</span>
        {results.has_more && (
          <Link
            href={`/search?q=${encodeURIComponent(query)}&page=${page + 1}`}
            className="rounded-lg border border-card-border bg-card-bg px-4 py-2 text-sm font-medium text-foreground hover:border-accent transition-colors"
          >
            Next &rarr;
          </Link>
        )}
      </div>
    </div>
  );
}
