import Image from "next/image";
import { AVAILABLE_RARITY_SET_CODES } from "@/generated/rarity-icon-sets";

interface RarityBadgeProps {
  rarity: string;
  compact?: boolean;
  setCode?: string;
  setName?: string;
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
      return "bg-slate-700/45 text-slate-100 ring-slate-300/55";
    case "uncommon":
      return "bg-zinc-200/20 text-zinc-100 ring-zinc-300/70";
    case "rare":
      return "bg-amber-400/20 text-amber-100 ring-amber-300/75";
    case "mythic":
      return "bg-orange-500/25 text-orange-100 ring-orange-400/85";
    default:
      return "bg-stone-500/20 text-stone-200 ring-stone-300/60";
  }
}

const DEFAULT_RARITY_ICON_PATHS: Record<string, string> = {
  common: "/icons/rarity/common.svg",
  uncommon: "/icons/rarity/uncommon.svg",
  rare: "/icons/rarity/rare.svg",
  mythic: "/icons/rarity/mythic.svg",
};

const RARITY_LETTER_BY_KIND: Record<string, "C" | "U" | "R" | "M"> = {
  common: "C",
  uncommon: "U",
  rare: "R",
  mythic: "M",
};

function resolveSetIconCode(setCode?: string): string | null {
  const normalizedSetCode = setCode?.trim().toLowerCase();
  if (normalizedSetCode && AVAILABLE_RARITY_SET_CODES.has(normalizedSetCode)) {
    return normalizedSetCode;
  }
  return null;
}

function resolveRarityIconPath(
  kind: ReturnType<typeof normalizeRarity>,
  setCode?: string,
): string | null {
  const rarityLetter = RARITY_LETTER_BY_KIND[kind];
  if (!rarityLetter) {
    return null;
  }

  const iconCode = resolveSetIconCode(setCode);
  if (iconCode) {
    return `/icons/rarity/sets/${iconCode}/${rarityLetter}.svg`;
  }

  return DEFAULT_RARITY_ICON_PATHS[kind] ?? null;
}

export default function RarityBadge({
  rarity,
  compact = false,
  setCode,
}: RarityBadgeProps) {
  const kind = normalizeRarity(rarity);
  const sizeClasses = compact
    ? "min-h-5 px-2 py-0.5 text-[10px]"
    : "min-h-6 px-2.5 py-0.5 text-xs";
  const iconSize = compact ? "h-3.5 w-3.5 shrink-0" : "h-4 w-4 shrink-0";
  const iconPath = resolveRarityIconPath(kind, setCode);

  return (
    <span
      className={`inline-flex w-fit max-w-full items-center gap-1 rounded-md ring-1 ring-inset uppercase tracking-wide text-nowrap leading-none ${sizeClasses} ${rarityClasses(
        kind,
      )}`}
      aria-label={`Rarity: ${rarity}`}
    >
      {iconPath ? (
        <Image
          src={iconPath}
          alt=""
          width={compact ? 14 : 16}
          height={compact ? 14 : 16}
          className={iconSize}
          aria-hidden="true"
          unoptimized
        />
      ) : null}
      {rarity}
    </span>
  );
}
