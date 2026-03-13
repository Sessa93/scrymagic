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
  const [activePrintId, setActivePrintId] = useState<string | null>(null);
  const [isPopupHovered, setIsPopupHovered] = useState(false);
  const activePrint = useMemo(
    () =>
      activePrintId
        ? (prints.find((print) => print.id === activePrintId) ?? null)
        : null,
    [activePrintId, prints],
  );

  return (
    <div
      className={`relative w-full max-w-full min-w-0 overflow-visible ${
        activePrint ? "z-130" : ""
      }`}
      onMouseLeave={() => {
        setActivePrintId(null);
        setIsPopupHovered(false);
      }}
    >
      <div className="flex w-full max-w-full min-w-0 gap-4 overflow-x-auto pb-4">
        {prints.map((print) => {
          const printImage = getCardImage(print, "small");
          const isActive = activePrint?.id === print.id;

          return (
            <Link
              key={print.id}
              href={`/card/${print.id}`}
              className="group shrink-0 w-30"
              onMouseEnter={() => {
                setActivePrintId(print.id);
                setIsPopupHovered(true);
              }}
              onFocus={() => {
                setActivePrintId(print.id);
                setIsPopupHovered(true);
              }}
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
        <div className="absolute top-2 right-0 z-140 max-w-[calc(100vw-2rem)] overflow-x-auto overflow-y-visible [scrollbar-width:thin]">
          <Link
            href={`/card/${activePrint.id}`}
            className="relative flex w-max items-start overflow-visible"
            onMouseEnter={() => setIsPopupHovered(true)}
            onMouseLeave={() => setIsPopupHovered(false)}
            onFocus={() => setIsPopupHovered(true)}
            onBlur={() => setIsPopupHovered(false)}
          >
            <div
              className={`w-55 overflow-hidden rounded-[18px] border border-card-border bg-surface/95 p-2 shadow-2xl backdrop-blur-sm transition-transform duration-200 ${
                isPopupHovered ? "scale-[1.015]" : ""
              }`}
            >
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

            <div
              className={`overflow-hidden transition-[max-width,opacity] duration-200 ease-out ${
                isPopupHovered
                  ? "max-w-52 opacity-100 pointer-events-auto"
                  : "max-w-0 opacity-0 pointer-events-none"
              }`}
            >
              <div className="h-full rounded-2xl border border-card-border bg-surface/95 p-3 shadow-2xl backdrop-blur-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                  Printing Details
                </p>
                <div className="mt-2 space-y-1.5 text-xs">
                  <p className="text-foreground">
                    <span className="text-muted">Set:</span>{" "}
                    {activePrint.set_name}
                  </p>
                  <p className="text-foreground">
                    <span className="text-muted">Collector:</span> #
                    {activePrint.collector_number ?? "-"}
                  </p>
                  <p className="text-foreground capitalize">
                    <span className="text-muted">Rarity:</span>{" "}
                    {activePrint.rarity}
                  </p>
                  <p className="text-foreground">
                    <span className="text-muted">Language:</span>{" "}
                    {formatLanguageCode(activePrint.lang)}
                  </p>
                </div>
                <p className="mt-3 text-[11px] text-accent">
                  Open this printing
                </p>
              </div>
            </div>
          </Link>
          <div className="pointer-events-none absolute top-0 right-0 h-full w-6 bg-linear-to-l from-card-bg/85 to-transparent" />
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
