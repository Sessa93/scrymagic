import { Fragment } from "react";
import ManaSymbol from "@/components/ManaSymbol";
import type { ScryfallCardSymbol } from "@/lib/scryfall";

const SYMBOL_PATTERN = /(\{[^}]+\})/g;

export type ScryfallSymbolDictionary = Record<string, ScryfallCardSymbol>;

interface ScryfallTextProps {
  text: string;
  symbols: ScryfallSymbolDictionary;
  symbolClassName?: string;
}

export function buildSymbolDictionary(
  symbolList: ScryfallCardSymbol[],
): ScryfallSymbolDictionary {
  return Object.fromEntries(
    symbolList.flatMap((symbol) => {
      const keys = [
        symbol.symbol,
        ...(symbol.loose_variant ? [`{${symbol.loose_variant}}`] : []),
        ...(symbol.gatherer_alternates ?? []),
      ];

      return keys.map((key) => [key, symbol] as const);
    }),
  );
}

export default function ScryfallText({
  text,
  symbols,
  symbolClassName,
}: ScryfallTextProps) {
  return text.split(SYMBOL_PATTERN).map((segment, index) => {
    const symbol = symbols[segment];

    if (!symbol) {
      return <Fragment key={`${segment}-${index}`}>{segment}</Fragment>;
    }

    return (
      <ManaSymbol
        key={`${segment}-${index}`}
        symbol={symbol.symbol}
        svgUri={symbol.svg_uri}
        label={symbol.english}
        className={symbolClassName}
      />
    );
  });
}
