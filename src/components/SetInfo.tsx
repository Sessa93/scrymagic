import type { ScryfallSet } from "@/lib/scryfall";
import Link from "next/link";

interface SetInfoProps {
  set: ScryfallSet;
  childSets?: ScryfallSet[];
  parentSet?: ScryfallSet;
}

export default function SetInfo({ set, childSets, parentSet }: SetInfoProps) {
  const formatSetType = (type: string): string => {
    return type
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const formatDate = (dateStr: string | undefined): string => {
    if (!dateStr) return "Unknown";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="mb-8 rounded-lg border border-card-border bg-card-bg/50 backdrop-blur-sm p-6">
      {/* Main set header */}
      <div className="mb-6">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-surface ring-1 ring-inset ring-card-border">
            <img src={set.icon_svg_uri} alt={set.name} className="h-10 w-10" />
          </div>

          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h1 className="text-3xl font-bold text-foreground">{set.name}</h1>
              <span className="inline-flex items-center rounded-sm bg-accent/20 px-3 py-1 text-sm font-semibold text-accent ring-1 ring-inset ring-accent/40">
                {formatSetType(set.set_type)}
              </span>
            </div>

            <div className="text-sm text-muted">
              Set Code:{" "}
              <span className="font-mono font-semibold text-foreground">
                {set.code.toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Set details grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 mb-6">
        {/* Card Count */}
        <div className="rounded-md bg-surface/50 p-4 ring-1 ring-inset ring-card-border/50">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted mb-1">
            Cards
          </div>
          <div className="text-2xl font-bold text-foreground">
            {set.card_count.toLocaleString()}
          </div>
        </div>

        {/* Release Date */}
        <div className="rounded-md bg-surface/50 p-4 ring-1 ring-inset ring-card-border/50">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted mb-1">
            Released
          </div>
          <div className="text-sm font-semibold text-foreground">
            {formatDate(set.released_at)}
          </div>
        </div>

        {/* Block (if available) */}
        {set.block && (
          <div className="rounded-md bg-surface/50 p-4 ring-1 ring-inset ring-card-border/50">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted mb-1">
              Block
            </div>
            <div className="text-sm font-semibold text-foreground">
              {set.block}
            </div>
          </div>
        )}

        {/* Printed Size (if available) */}
        {set.printed_size && (
          <div className="rounded-md bg-surface/50 p-4 ring-1 ring-inset ring-card-border/50">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted mb-1">
              Printed Size
            </div>
            <div className="text-2xl font-bold text-foreground">
              {set.printed_size}
            </div>
          </div>
        )}
      </div>

      {/* Parent/Child Sets section */}
      {(parentSet || (childSets && childSets.length > 0)) && (
        <div className="border-t border-card-border/40 pt-6 space-y-4">
          {/* Parent Set */}
          {parentSet && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted mb-3">
                Parent Set
              </h3>
              <Link
                href={`/set/${parentSet.code}`}
                className="group inline-flex items-center gap-3 rounded-lg border border-card-border bg-surface/50 px-4 py-3 transition-colors hover:bg-surface hover:border-accent/40"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded bg-card-bg ring-1 ring-inset ring-card-border">
                  <img
                    src={parentSet.icon_svg_uri}
                    alt={parentSet.name}
                    className="h-5 w-5"
                  />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-foreground group-hover:text-accent">
                    {parentSet.name}
                  </div>
                  <div className="text-xs text-muted">
                    {parentSet.card_count.toLocaleString()} cards
                  </div>
                </div>
              </Link>
            </div>
          )}

          {/* Child Sets */}
          {childSets && childSets.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted mb-3">
                Related Set{childSets.length !== 1 ? "s" : ""}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {childSets.map((childSet) => (
                  <Link
                    key={childSet.code}
                    href={`/set/${childSet.code}`}
                    className="group inline-flex items-center gap-3 rounded-lg border border-card-border bg-surface/50 px-4 py-3 transition-colors hover:bg-surface hover:border-accent/40"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded bg-card-bg ring-1 ring-inset ring-card-border">
                      <img
                        src={childSet.icon_svg_uri}
                        alt={childSet.name}
                        className="h-5 w-5"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-foreground group-hover:text-accent">
                        {childSet.name}
                      </div>
                      <div className="text-xs text-muted">
                        {childSet.card_count.toLocaleString()} cards
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
