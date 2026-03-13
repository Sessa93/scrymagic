import {
  getCardRulings,
  getCardPrints,
  getCardImage,
  getCardSymbols,
  formatManaCost,
  ScryfallCard,
} from "@/lib/scryfall";
import { getCachedCardById } from "@/lib/scryfall-server";
import Image from "next/image";
import Link from "next/link";
import ManaSymbol from "@/components/ManaSymbol";
import ScryfallText, { buildSymbolDictionary } from "@/components/ScryfallText";
import RarityBadge from "@/components/RarityBadge";
import BackToResultsButton from "@/components/BackToResultsButton";
import OtherPrintingsStrip from "@/components/OtherPrintingsStrip";
import { notFound } from "next/navigation";

interface CardPageProps {
  params: Promise<{ id: string }>;
}

export default async function CardPage({ params }: CardPageProps) {
  const { id } = await params;

  let card;
  try {
    card = await getCachedCardById(id);
  } catch {
    notFound();
  }

  let rulings: { published_at: string; comment: string; source: string }[] = [];
  try {
    const rulingsData = await getCardRulings(id);
    rulings = rulingsData.data;
  } catch {
    // Rulings may not be available
  }

  let alternatePrints: ScryfallCard[] = [];
  let localizedPrints: ScryfallCard[] = [];
  try {
    if (card.prints_search_uri) {
      const printsData = await getCardPrints(card.prints_search_uri);
      const allPrints = printsData.data;
      alternatePrints = allPrints.filter((p) => p.id !== card.id);
      localizedPrints = allPrints
        .filter((p) => isSameLocalizedPrinting(p, card))
        .sort((a, b) => {
          if (a.id === card.id) return -1;
          if (b.id === card.id) return 1;
          return getLanguageLabel(a.lang).localeCompare(
            getLanguageLabel(b.lang),
          );
        });
    }
  } catch {
    // Prints may not be available
  }

  const symbolDictionary = buildSymbolDictionary(await getCardSymbols());

  const imageUrl = getCardImage(card, "png");
  const manaSymbols = formatManaCost(card.mana_cost);

  // Get oracle text from main card or first face
  const oracleText =
    card.oracle_text ||
    card.card_faces?.map((f) => f.oracle_text).join("\n\n---\n\n") ||
    "";

  const typeLine =
    card.type_line ||
    card.card_faces?.map((f) => f.type_line).join(" // ") ||
    "";
  const setHref = buildSearchHref(`set:${card.set}`);
  const artistHref = card.artist
    ? buildSearchHref(`a:"${card.artist.replaceAll('"', '\\"')}"`)
    : null;
  const legalityGroups = getLegalityGroups(card.legalities);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <BackToResultsButton />

      <div className="grid gap-8 md:grid-cols-[380px_1fr]">
        {/* Card Image */}
        <div className="flex flex-col items-center gap-4">
          {imageUrl ? (
            <div className="overflow-hidden rounded-md bg-surface shadow-2xl">
              <Image
                src={imageUrl}
                alt={card.name}
                width={380}
                height={530}
                className="block w-full rounded-md"
                priority
              />
            </div>
          ) : (
            <div className="flex h-132.5 w-95 items-center justify-center rounded-xl bg-surface text-muted">
              No image available
            </div>
          )}

          {/* Second face for double-faced cards */}
          {card.card_faces && card.card_faces[1]?.image_uris && (
            <div className="overflow-hidden rounded-md bg-surface shadow-2xl">
              <Image
                src={
                  card.card_faces[1].image_uris.png ||
                  card.card_faces[1].image_uris.large
                }
                alt={card.card_faces[1].name}
                width={380}
                height={530}
                className="block w-full rounded-md"
              />
            </div>
          )}

          {localizedPrints.length > 0 && (
            <div className="w-full rounded-xl border border-card-border bg-card-bg p-3">
              <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                Available Localizations
              </h2>
              <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                {localizedPrints.map((print) => {
                  const localizedImage = getCardImage(print, "small");
                  const languageLabel = getLanguageLabel(print.lang);
                  const isCurrent = print.id === card.id;

                  return (
                    <Link
                      key={print.id}
                      href={`/card/${print.id}`}
                      className={`flex items-center gap-2 rounded-sm border px-2 py-1.5 transition-colors ${
                        isCurrent
                          ? "border-accent/70 bg-accent/12"
                          : "border-card-border bg-surface hover:border-accent/45 hover:bg-surface-elevated"
                      }`}
                    >
                      <div className="h-14 w-10 shrink-0 overflow-hidden rounded-xs bg-surface-elevated">
                        {localizedImage ? (
                          <Image
                            src={localizedImage}
                            alt={`${print.name} (${languageLabel})`}
                            width={40}
                            height={56}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[9px] text-muted">
                            N/A
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                          {languageLabel}
                          {isCurrent ? " • Current" : ""}
                        </div>
                        <p className="truncate text-xs text-foreground">
                          {print.printed_name || print.name}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          <a
            href={card.scryfall_uri}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted hover:text-accent transition-colors"
          >
            View on Scryfall &rarr;
          </a>
        </div>

        {/* Card Details */}
        <div className="min-w-0 space-y-6">
          {/* Header */}
          <div>
            <div className="flex flex-wrap items-start gap-3">
              <h1 className="text-3xl font-bold text-foreground">
                <ScryfallText text={card.name} symbols={symbolDictionary} />
              </h1>
              {manaSymbols.length > 0 && (
                <div className="flex items-center gap-0.5 pt-1.5">
                  {manaSymbols.map((sym, i) => (
                    <ManaSymbol
                      key={i}
                      symbol={sym}
                      svgUri={symbolDictionary[sym]?.svg_uri}
                      label={symbolDictionary[sym]?.english}
                      className="mx-0.5 inline-block h-6 w-6"
                    />
                  ))}
                </div>
              )}
            </div>
            <p className="mt-1 text-lg text-muted">
              <ScryfallText text={typeLine} symbols={symbolDictionary} />
            </p>
          </div>

          {/* Oracle Text */}
          {oracleText && (
            <div className="rounded-xl border border-card-border bg-card-bg p-4">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted">
                Oracle Text
              </h2>
              <div className="space-y-2 text-foreground leading-relaxed">
                {oracleText.split("\n").map((line, i) => (
                  <p key={i}>
                    <ScryfallText
                      text={line}
                      symbols={symbolDictionary}
                      symbolClassName="mx-0.5 inline-block h-[1.1em] w-[1.1em] align-[-0.18em]"
                    />
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Flavor Text */}
          {card.flavor_text && (
            <div className="rounded-xl border border-card-border bg-card-bg p-4">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted">
                Flavor Text
              </h2>
              <p className="italic text-muted leading-relaxed">
                <ScryfallText
                  text={card.flavor_text}
                  symbols={symbolDictionary}
                  symbolClassName="mx-0.5 inline-block h-[1.1em] w-[1.1em] align-[-0.18em]"
                />
              </p>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {(card.power || card.toughness) && (
              <InfoCard
                label="Power / Toughness"
                value={`${card.power} / ${card.toughness}`}
              />
            )}
            {card.loyalty && <InfoCard label="Loyalty" value={card.loyalty} />}
            <InfoCard
              label="Rarity"
              valueNode={
                <RarityBadge
                  rarity={card.rarity}
                  setCode={card.set}
                  setName={card.set_name}
                />
              }
            />
            <InfoCard
              label="Set"
              valueNode={
                <Link
                  href={setHref}
                  className="mt-0.5 inline-block text-sm font-medium text-foreground hover:text-accent transition-colors"
                >
                  {card.set_name}
                </Link>
              }
            />
            {card.collector_number && (
              <InfoCard
                label="Collector #"
                value={`${card.set.toUpperCase()} #${card.collector_number}`}
              />
            )}
            {card.artist && (
              <InfoCard
                label="Artist"
                valueNode={
                  artistHref ? (
                    <Link
                      href={artistHref}
                      className="mt-0.5 inline-block text-sm font-medium text-foreground hover:text-accent transition-colors"
                    >
                      {card.artist}
                    </Link>
                  ) : undefined
                }
                value={artistHref ? undefined : card.artist}
              />
            )}
            {card.released_at && (
              <InfoCard label="Released" value={card.released_at} />
            )}
            <InfoCard label="CMC" value={card.cmc.toString()} />
          </div>

          {/* Keywords */}
          {card.keywords && card.keywords.length > 0 && (
            <div>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted">
                Keywords
              </h2>
              <div className="flex flex-wrap gap-2">
                {card.keywords.map((kw) => (
                  <span
                    key={kw}
                    className="rounded-sm border border-card-border bg-surface px-3 py-1 text-xs font-medium text-foreground"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Legalities */}
          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">
              Legalities
            </h2>
            <div className="space-y-3 rounded-xl border border-card-border bg-card-bg p-4">
              {legalityGroups.map((group) => (
                <div key={group.status} className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                      {formatLegalityLabel(group.status)}
                    </h3>
                    <span
                      className={`inline-flex items-center rounded-sm px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${getLegalityBadgeClass(
                        group.status,
                      )}`}
                    >
                      {group.items.length}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {group.items.map((item) => (
                      <span
                        key={item.format}
                        className="rounded-sm border border-card-border/70 bg-surface px-2.5 py-1 text-xs text-foreground"
                      >
                        {item.label}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Prices */}
          {card.prices && Object.values(card.prices).some(Boolean) && (
            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">
                Prices
              </h2>
              <div className="flex flex-wrap gap-3">
                {card.prices.usd && (
                  <PriceBadge label="USD" value={`$${card.prices.usd}`} />
                )}
                {card.prices.usd_foil && (
                  <PriceBadge label="Foil" value={`$${card.prices.usd_foil}`} />
                )}
                {card.prices.eur && (
                  <PriceBadge label="EUR" value={`€${card.prices.eur}`} />
                )}
                {card.prices.tix && (
                  <PriceBadge label="MTGO" value={`${card.prices.tix} tix`} />
                )}
              </div>
            </div>
          )}

          {alternatePrints.length > 0 && (
            <div className="rounded-xl border border-card-border bg-card-bg/80 p-3 backdrop-blur-sm">
              <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                Other Printings ({alternatePrints.length})
              </h2>
              <OtherPrintingsStrip prints={alternatePrints} />
            </div>
          )}

          {/* Rulings */}
          {rulings.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">
                Rulings
              </h2>
              <div className="space-y-3">
                {rulings.map((ruling, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-card-border bg-card-bg p-4"
                  >
                    <p className="text-sm text-foreground leading-relaxed">
                      <ScryfallText
                        text={ruling.comment}
                        symbols={symbolDictionary}
                        symbolClassName="mx-0.5 inline-block h-[1.1em] w-[1.1em] align-[-0.18em]"
                      />
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {ruling.source} &middot; {ruling.published_at}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoCard({
  label,
  value,
  valueNode,
}: {
  label: string;
  value?: string;
  valueNode?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-card-border bg-card-bg p-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">
        {label}
      </p>
      {valueNode ? (
        <div className="mt-1">{valueNode}</div>
      ) : (
        <p className="mt-0.5 text-sm font-medium capitalize">{value}</p>
      )}
    </div>
  );
}

function formatLegalityLabel(status: string): string {
  if (status === "not_legal") return "Not Legal";
  return status;
}

function formatLegalityName(format: string): string {
  return format.replace(/_/g, " ");
}

function getLegalityGroups(legalities: Record<string, string>) {
  const statusOrder = ["legal", "restricted", "banned", "not_legal"];
  const entries = Object.entries(legalities)
    .map(([format, status]) => ({
      format,
      status,
      label: formatLegalityName(format),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return statusOrder
    .map((status) => ({
      status,
      items: entries.filter((entry) => entry.status === status),
    }))
    .filter((group) => group.items.length > 0);
}

function getLegalityBadgeClass(status: string): string {
  if (status === "legal") {
    return "bg-emerald-500/20 text-emerald-200 ring-1 ring-inset ring-emerald-400/60";
  }
  if (status === "restricted") {
    return "bg-amber-500/20 text-amber-200 ring-1 ring-inset ring-amber-400/60";
  }
  if (status === "banned") {
    return "bg-red-500/20 text-red-200 ring-1 ring-inset ring-red-400/60";
  }
  return "bg-zinc-500/20 text-zinc-300 ring-1 ring-inset ring-zinc-400/50";
}

function PriceBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-card-border bg-card-bg px-4 py-2">
      <span className="text-xs text-muted">{label}</span>
      <span className="ml-2 text-sm font-bold text-green-400">{value}</span>
    </div>
  );
}

function buildSearchHref(query: string): string {
  return `/search?q=${encodeURIComponent(query)}&original=${encodeURIComponent(query)}`;
}

function isSameLocalizedPrinting(
  candidate: ScryfallCard,
  source: ScryfallCard,
) {
  if (candidate.set !== source.set) {
    return false;
  }

  if (candidate.collector_number && source.collector_number) {
    return candidate.collector_number === source.collector_number;
  }

  return candidate.name === source.name;
}

function getLanguageLabel(langCode?: string): string {
  const labelByCode: Record<string, string> = {
    en: "English",
    es: "Spanish",
    fr: "French",
    de: "German",
    it: "Italian",
    pt: "Portuguese",
    ja: "Japanese",
    ko: "Korean",
    ru: "Russian",
    zhs: "Chinese (Simplified)",
    zht: "Chinese (Traditional)",
    he: "Hebrew",
    la: "Latin",
    grc: "Ancient Greek",
    ar: "Arabic",
    sa: "Sanskrit",
    ph: "Phyrexian",
  };

  if (!langCode) {
    return "Unknown";
  }

  return labelByCode[langCode] || langCode.toUpperCase();
}
