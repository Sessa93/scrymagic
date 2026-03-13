"use client";

import { getCardImage, ScryfallCard } from "@/lib/scryfall";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

export default function OtherPrintingsStrip({
  prints,
}: {
  prints: ScryfallCard[];
}) {
  const [activePrintId, setActivePrintId] = useState<string | null>(
    prints[0]?.id ?? null,
  );
  const activePrint = useMemo(
    () =>
      prints.find((print) => print.id === activePrintId) ?? prints[0] ?? null,
    [activePrintId, prints],
  );

  return (
    <div className="relative">
      <div className="flex gap-4 overflow-x-auto pb-4">
        {prints.map((print) => {
          const printImage = getCardImage(print, "small");
          const isActive = activePrint?.id === print.id;

          return (
            <Link
              key={print.id}
              href={`/card/${print.id}`}
              className="group shrink-0 w-30"
              onMouseEnter={() => setActivePrintId(print.id)}
              onFocus={() => setActivePrintId(print.id)}
            >
              <div
                className={`overflow-hidden rounded-md bg-surface shadow-md transition-transform duration-200 ${
                  isActive ? "scale-105" : "group-hover:scale-105"
                }`}
              >
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

      {activePrint ? (
        <div className="absolute top-2 right-2 z-40">
          <Link
            href={`/card/${activePrint.id}`}
            className="group/popup relative block"
          >
            <div className="w-55 overflow-hidden rounded-[18px] border border-card-border bg-surface/95 p-2 shadow-2xl backdrop-blur-sm transition-transform duration-200 group-hover/popup:scale-[1.015]">
              <div className="overflow-hidden rounded-md bg-card-bg">
                {getCardImage(activePrint, "normal") ? (
                  <Image
                    src={getCardImage(activePrint, "normal")}
                    alt={`${activePrint.name} preview`}
                    width={204}
                    height={285}
                    className="block w-full"
                  />
                ) : (
                  <div className="flex h-71 w-full items-center justify-center text-xs text-muted">
                    No image
                  </div>
                )}
              </div>
              <div className="mt-2 px-0.5">
                <p className="truncate text-sm font-semibold text-foreground">
                  {activePrint.name}
                </p>
                <p className="text-xs text-muted">
                  {activePrint.set_name} #{activePrint.collector_number}
                </p>
              </div>
            </div>

            <div className="pointer-events-none absolute top-0 left-full ml-1 w-0 overflow-hidden opacity-0 transition-all duration-250 ease-out group-hover/popup:w-52 group-hover/popup:opacity-100">
              <div className="h-full rounded-2xl border border-card-border bg-surface/95 p-3 shadow-2xl backdrop-blur-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                  Printing Details
                </p>
                <div className="mt-2 space-y-1.5 text-xs">
                  <p className="text-foreground">
                    <span className="text-muted">Set:</span> {activePrint.set_name}
                  </p>
                  <p className="text-foreground">
                    <span className="text-muted">Collector:</span> #
                    {activePrint.collector_number ?? "-"}
                  </p>
                  <p className="text-foreground capitalize">
                    <span className="text-muted">Rarity:</span> {activePrint.rarity}
                  </p>
                  <p className="text-foreground">
                    <span className="text-muted">Language:</span>{" "}
                    {formatLanguageCode(activePrint.lang)}
                  </p>
                </div>
                <p className="mt-3 text-[11px] text-accent">Open this printing</p>
              </div>
            </div>
          </Link>
        </div>
      ) : null}
    </div>
  );
}

function formatLanguageCode(languageCode?: string): string {
  if (!languageCode) {
    return "Unknown";
  }

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

  return labelByCode[languageCode] || languageCode.toUpperCase();
}
