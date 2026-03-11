import { searchCards } from "@/lib/scryfall";
import SortableCardGrid from "@/components/SortableCardGrid";
import Link from "next/link";

interface SearchPageProps {
  searchParams: Promise<{ q?: string; page?: string; original?: string }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = params.q || "";
  const original = params.original || "";
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
            No cards match &ldquo;{original || query}&rdquo;. Try a different
            search term or check the{" "}
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

  // Preserve `original` across pagination links
  const paginationBase = original
    ? `/search?q=${encodeURIComponent(query)}&original=${encodeURIComponent(original)}`
    : `/search?q=${encodeURIComponent(query)}`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6 space-y-1">
        <h1 className="text-xl font-semibold">
          <span className="text-muted">Results for</span>{" "}
          <span className="text-foreground">
            &ldquo;{original || query}&rdquo;
          </span>
          <span className="ml-2 text-sm font-normal text-muted">
            ({results.total_cards.toLocaleString()} cards)
          </span>
        </h1>
        {original && original !== query && (
          <p className="flex items-center gap-1.5 text-xs text-muted">
            <svg
              viewBox="0 0 24 24"
              className="h-3.5 w-3.5 shrink-0 text-accent"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2Zm1 14.5h-2v-6h2v6Zm0-8h-2V6.5h2V8.5Z" />
            </svg>
            Translated to Scryfall syntax:{" "}
            <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-xs text-foreground ring-1 ring-inset ring-card-border">
              {query}
            </code>
          </p>
        )}
      </div>

      <SortableCardGrid cards={results.data} />

      {/* Pagination */}
      <div className="mt-8 flex items-center justify-center gap-4 pb-8">
        {page > 1 && (
          <Link
            href={`${paginationBase}&page=${page - 1}`}
            className="rounded-lg border border-card-border bg-card-bg px-4 py-2 text-sm font-medium text-foreground hover:border-accent transition-colors"
          >
            &larr; Previous
          </Link>
        )}
        <span className="text-sm text-muted">Page {page}</span>
        {results.has_more && (
          <Link
            href={`${paginationBase}&page=${page + 1}`}
            className="rounded-lg border border-card-border bg-card-bg px-4 py-2 text-sm font-medium text-foreground hover:border-accent transition-colors"
          >
            Next &rarr;
          </Link>
        )}
      </div>
    </div>
  );
}
