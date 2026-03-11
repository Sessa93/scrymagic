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
    <div className="mb-4 rounded-lg border border-card-border bg-card-bg/50 backdrop-blur-sm p-4">
      {/* Main set header */}
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-surface ring-1 ring-inset ring-card-border">
          <img src={set.icon_svg_uri} alt={set.name} className="h-6 w-6" />
        </div>

        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          <h1 className="text-xl font-bold text-foreground leading-tight">
            {set.name}
          </h1>
          <span className="inline-flex items-center rounded-sm bg-accent/20 px-2 py-0.5 text-xs font-semibold text-accent ring-1 ring-inset ring-accent/40">
            {formatSetType(set.set_type)}
          </span>
          <span className="text-xs text-muted font-mono">
            {set.code.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Set details row */}
      <div className="flex flex-wrap gap-3 mb-3">
        <div className="rounded-md bg-surface/50 px-3 py-2 ring-1 ring-inset ring-card-border/50 flex items-center gap-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted">
            Cards
          </div>
          <div className="text-sm font-bold text-foreground">
            {set.card_count.toLocaleString()}
          </div>
        </div>

        <div className="rounded-md bg-surface/50 px-3 py-2 ring-1 ring-inset ring-card-border/50 flex items-center gap-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted">
            Released
          </div>
          <div className="text-sm font-semibold text-foreground">
            {formatDate(set.released_at)}
          </div>
        </div>

        {set.block && (
          <div className="rounded-md bg-surface/50 px-3 py-2 ring-1 ring-inset ring-card-border/50 flex items-center gap-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted">
              Block
            </div>
            <div className="text-sm font-semibold text-foreground">
              {set.block}
            </div>
          </div>
        )}

        {set.printed_size && (
          <div className="rounded-md bg-surface/50 px-3 py-2 ring-1 ring-inset ring-card-border/50 flex items-center gap-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted">
              Printed
            </div>
            <div className="text-sm font-bold text-foreground">
              {set.printed_size}
            </div>
          </div>
        )}
      </div>

      {/* Parent/Child Sets section */}
      {(parentSet || (childSets && childSets.length > 0)) && (
        <div className="border-t border-card-border/40 pt-3 space-y-3">
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
