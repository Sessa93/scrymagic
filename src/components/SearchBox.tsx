"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SearchBox() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
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
          placeholder='Search for Magic cards... (e.g. "lightning bolt", "t:creature c:red")'
          className="w-full rounded-xl border border-input-border bg-input-bg py-4 pl-12 pr-28 text-lg text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all"
          autoFocus
        />
        <button
          type="submit"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover transition-colors"
        >
          Search
        </button>
      </div>
      <p className="mt-3 text-center text-sm text-muted">
        Use{" "}
        <a
          href="https://scryfall.com/docs/syntax"
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:underline"
        >
          Scryfall syntax
        </a>{" "}
        for advanced searches — e.g.{" "}
        <button
          type="button"
          onClick={() => { setQuery("t:creature c:green pow>=5"); }}
          className="text-accent hover:underline"
        >
          t:creature c:green pow&gt;=5
        </button>
      </p>
    </form>
  );
}
