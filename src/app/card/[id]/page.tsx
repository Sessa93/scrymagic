import {
  getCardById,
  getCardRulings,
  getCardPrints,
  getCardImage,
  formatManaCost,
  ScryfallCard,
} from "@/lib/scryfall";
import Image from "next/image";
import Link from "next/link";
import ManaSymbol from "@/components/ManaSymbol";
import RarityBadge from "@/components/RarityBadge";
import BackToResultsButton from "@/components/BackToResultsButton";
import { notFound } from "next/navigation";

interface CardPageProps {
  params: Promise<{ id: string }>;
}

export default async function CardPage({ params }: CardPageProps) {
  const { id } = await params;

  let card;
  try {
    card = await getCardById(id);
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
  try {
    if (card.prints_search_uri) {
      const printsData = await getCardPrints(card.prints_search_uri);
      alternatePrints = printsData.data.filter((p) => p.id !== card.id);
    }
  } catch {
    // Prints may not be available
  }

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
        <div className="space-y-6">
          {/* Header */}
          <div>
            <div className="flex flex-wrap items-start gap-3">
              <h1 className="text-3xl font-bold text-foreground">
                {card.name}
              </h1>
              {manaSymbols.length > 0 && (
                <div className="flex items-center gap-0.5 pt-1.5">
                  {manaSymbols.map((sym, i) => (
                    <ManaSymbol key={i} symbol={sym} />
                  ))}
                </div>
              )}
            </div>
            <p className="mt-1 text-lg text-muted">{typeLine}</p>
          </div>

          {/* Oracle Text */}
          {oracleText && (
            <div className="rounded-xl border border-card-border bg-card-bg p-4">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted">
                Oracle Text
              </h2>
              <div className="space-y-2 text-foreground leading-relaxed">
                {oracleText.split("\n").map((line, i) => (
                  <p key={i}>{line}</p>
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
                {card.flavor_text}
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
              valueNode={<RarityBadge rarity={card.rarity} />}
            />
            <InfoCard label="Set" value={card.set_name} />
            {card.collector_number && (
              <InfoCard
                label="Collector #"
                value={`${card.set.toUpperCase()} #${card.collector_number}`}
              />
            )}
            {card.artist && <InfoCard label="Artist" value={card.artist} />}
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
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {Object.entries(card.legalities).map(([format, status]) => (
                <div
                  key={format}
                  className="flex items-center justify-between rounded-lg border border-card-border bg-card-bg px-3 py-1.5"
                >
                  <span className="text-xs capitalize text-muted">
                    {format.replace(/_/g, " ")}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-sm px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${getLegalityBadgeClass(
                      status,
                    )}`}
                  >
                    {formatLegalityLabel(status)}
                  </span>
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
                      {ruling.comment}
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

      {/* Other Printings */}
      {alternatePrints.length > 0 && (
        <div className="mt-12">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">
            Other Printings ({alternatePrints.length})
          </h2>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {alternatePrints.map((print) => {
              const printImage = getCardImage(print, "small");
              return (
                <Link
                  key={print.id}
                  href={`/card/${print.id}`}
                  className="group shrink-0 w-30"
                >
                  <div className="overflow-hidden rounded-md bg-surface shadow-md transition-transform group-hover:scale-105">
                    {printImage ? (
                      <Image
                        src={printImage}
                        alt={`${print.name} — ${print.set_name}`}
                        width={120}
                        height={167}
                        className="block w-full"
                      />
                    ) : (
                      <div className="flex h-41.75 items-center justify-center bg-surface text-xs text-muted">
                        No image
                      </div>
                    )}
                  </div>
                  <div className="mt-1.5 px-0.5">
                    <p className="truncate text-xs font-medium text-foreground">
                      {print.set_name}
                    </p>
                    <p className="text-[11px] text-muted">
                      #{print.collector_number} &middot;{" "}
                      <span className="capitalize">{print.rarity}</span>
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
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
