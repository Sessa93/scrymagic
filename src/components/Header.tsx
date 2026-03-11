"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

export default function Header() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [translating, setTranslating] = useState(false);
  const pathname = usePathname();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    setTranslating(true);
    try {
      const res = await fetch("/api/translate-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmed }),
      });
      const data = await res.json();
      const scryfallQuery: string = data.translated ?? trimmed;
      router.push(
        `/search?q=${encodeURIComponent(scryfallQuery)}&original=${encodeURIComponent(trimmed)}`,
      );
    } catch {
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    } finally {
      setTranslating(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-card-border bg-card-bg/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-bold text-accent hover:text-accent-hover transition-colors shrink-0"
        >
          <svg
            className="h-6 w-6"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
          ScryMagic
        </Link>
        {pathname !== "/" ? (
          <form onSubmit={handleSearch} className="flex flex-1 max-w-xl">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search cards..."
              className="flex-1 rounded-l-lg border border-input-border bg-input-bg px-4 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
              disabled={translating}
            />
            <button
              type="submit"
              disabled={translating}
              className="rounded-r-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors disabled:cursor-not-allowed disabled:opacity-60"
            >
              {translating ? "Thinking..." : "Search"}
            </button>
          </form>
        ) : null}
      </div>
    </header>
  );
}
