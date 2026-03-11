"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SearchBox() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [translating, setTranslating] = useState(false);

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
      // Fall back to raw query if translation fails
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    } finally {
      setTranslating(false);
    }
  };

  return (
    <form onSubmit={handleSearch} className="w-full max-w-2xl">
      <div className="relative">
        <svg
          className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='Search for Magic cards... (e.g. "red dragons with flying")'
          className="w-full rounded-xl border border-input-border bg-input-bg py-4 pl-12 pr-28 text-lg text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all"
          autoFocus
          disabled={translating}
        />
        <button
          type="submit"
          disabled={translating}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {translating ? (
            <span className="flex items-center gap-1.5">
              <svg
                className="h-4 w-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
              Thinking…
            </span>
          ) : (
            "Search"
          )}
        </button>
      </div>
      <p className="mt-3 text-center text-sm text-muted">
        Search in plain English or use{" "}
        <a
          href="https://scryfall.com/docs/syntax"
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:underline"
        >
          Scryfall syntax
        </a>{" "}
        — e.g.{" "}
        <button
          type="button"
          onClick={() => {
            setQuery("green creatures with power 5 or more");
          }}
          className="text-accent hover:underline"
        >
          green creatures with power 5 or more
        </button>
      </p>
    </form>
  );
}
