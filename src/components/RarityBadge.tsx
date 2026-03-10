interface RarityBadgeProps {
  rarity: string;
  compact?: boolean;
}

function normalizeRarity(
  rarity: string,
): "common" | "uncommon" | "rare" | "mythic" | "other" {
  if (rarity === "common") return "common";
  if (rarity === "uncommon") return "uncommon";
  if (rarity === "rare") return "rare";
  if (rarity === "mythic") return "mythic";
  return "other";
}

function rarityClasses(rarity: ReturnType<typeof normalizeRarity>) {
  switch (rarity) {
    case "common":
      return "bg-slate-700/60 text-slate-200 ring-slate-400/60";
    case "uncommon":
      return "bg-zinc-300/20 text-zinc-100 ring-zinc-300/70";
    case "rare":
      return "bg-amber-400/20 text-amber-200 ring-amber-300/70";
    case "mythic":
      return "bg-orange-500/20 text-orange-200 ring-orange-400/80";
    default:
      return "bg-stone-500/20 text-stone-200 ring-stone-300/60";
  }
}

function RarityIcon({
  rarity,
}: {
  rarity: ReturnType<typeof normalizeRarity>;
}) {
  switch (rarity) {
    case "common":
      return <circle cx="12" cy="12" r="4.25" fill="currentColor" />;
    case "uncommon":
      return <path fill="currentColor" d="M7 7h10v10H7z" />;
    case "rare":
      return (
        <path fill="currentColor" d="m12 4 3 5 5 3-5 3-3 5-3-5-5-3 5-3z" />
      );
    case "mythic":
      return (
        <path
          fill="currentColor"
          d="m12 3.5 2.5 4.6 5.1.9-3.6 3.7.8 5.2-4.8-2.3-4.8 2.3.8-5.2L4.4 9l5.1-.9z"
        />
      );
    default:
      return <circle cx="12" cy="12" r="4.25" fill="currentColor" />;
  }
}

export default function RarityBadge({
  rarity,
  compact = false,
}: RarityBadgeProps) {
  const kind = normalizeRarity(rarity);
  const sizeClasses = compact ? "h-5 px-1.5 text-[10px]" : "h-6 px-2 text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-sm ring-1 ring-inset uppercase tracking-wide ${sizeClasses} ${rarityClasses(
        kind,
      )}`}
      aria-label={`Rarity: ${rarity}`}
    >
      <svg viewBox="0 0 24 24" className="h-3 w-3" aria-hidden="true">
        <RarityIcon rarity={kind} />
      </svg>
      {rarity}
    </span>
  );
}
