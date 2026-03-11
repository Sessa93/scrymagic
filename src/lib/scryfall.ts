// Scryfall API types and helpers
// API docs: https://scryfall.com/docs/api

export interface ScryfallCard {
  id: string;
  name: string;
  mana_cost?: string;
  cmc: number;
  type_line: string;
  oracle_text?: string;
  power?: string;
  toughness?: string;
  loyalty?: string;
  colors?: string[];
  color_identity: string[];
  set: string;
  set_name: string;
  rarity: string;
  image_uris?: {
    small: string;
    normal: string;
    large: string;
    png: string;
    art_crop: string;
    border_crop: string;
  };
  card_faces?: Array<{
    name: string;
    mana_cost?: string;
    type_line: string;
    oracle_text?: string;
    power?: string;
    toughness?: string;
    loyalty?: string;
    image_uris?: {
      small: string;
      normal: string;
      large: string;
      png: string;
      art_crop: string;
      border_crop: string;
    };
  }>;
  legalities: Record<string, string>;
  prices: Record<string, string | null>;
  artist?: string;
  released_at?: string;
  scryfall_uri: string;
  rulings_uri: string;
  flavor_text?: string;
  keywords?: string[];
  collector_number?: string;
  prints_search_uri?: string;
}

export interface ScryfallSearchResult {
  object: string;
  total_cards: number;
  has_more: boolean;
  next_page?: string;
  data: ScryfallCard[];
}

export interface ScryfallSet {
  id: string;
  code: string;
  name: string;
  set_type: string;
  released_at?: string;
  card_count: number;
  icon_svg_uri: string;
  parent_set_code?: string;
  block_code?: string;
  block?: string;
  printed_size?: number;
  digital?: boolean;
  scryfall_uri?: string;
}

export interface ScryfallRuling {
  object: string;
  source: string;
  published_at: string;
  comment: string;
}

export interface ScryfallCardSymbol {
  object: "card_symbol";
  symbol: string;
  loose_variant: string | null;
  english: string;
  svg_uri: string | null;
  transposable: boolean;
  represents_mana: boolean;
  appears_in_mana_costs: boolean;
  mana_value: number | null;
  hybrid: boolean;
  phyrexian: boolean;
  cmc: number | null;
  funny: boolean;
  colors: string[];
  gatherer_alternates: string[] | null;
}

const BASE_URL = "https://api.scryfall.com";

export async function scryfall<T>(
  path: string,
  options?: { revalidate?: number; cache?: RequestCache },
): Promise<T> {
  const isNoStore = options?.cache === "no-store";

  if (isNoStore) {
    path = `${path}${path.includes("?") ? "&" : "?"}nonce=${Date.now()}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Accept: "application/json" },
    ...(options?.cache ? { cache: options.cache } : {}),
    ...(!isNoStore
      ? {
          next: {
            revalidate:
              options?.revalidate !== undefined ? options.revalidate : 3600,
          },
        }
      : {}),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(
      error.details || `Scryfall API error: ${res.status} ${res.statusText}`,
    );
  }

  return res.json() as Promise<T>;
}

export async function searchCards(
  query: string,
  page: number = 1,
): Promise<ScryfallSearchResult> {
  const encoded = encodeURIComponent(query);
  return scryfall<ScryfallSearchResult>(
    `/cards/search?q=${encoded}&include_extras=true&include_variations=true&unique=prints&page=${page}`,
  );
}

export async function getCardById(id: string): Promise<ScryfallCard> {
  return scryfall<ScryfallCard>(`/cards/${id}`);
}

export async function getCardRulings(
  id: string,
): Promise<{ data: ScryfallRuling[] }> {
  return scryfall<{ data: ScryfallRuling[] }>(`/cards/${id}/rulings`);
}

export async function getCardPrints(
  printsSearchUri: string,
): Promise<ScryfallSearchResult> {
  const res = await fetch(printsSearchUri, {
    headers: { Accept: "application/json" },
    next: { revalidate: 3600 },
  });
  if (!res.ok) {
    throw new Error(`Scryfall API error: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<ScryfallSearchResult>;
}

export async function getRandomCard(): Promise<ScryfallCard> {
  return scryfall<ScryfallCard>("/cards/random", { cache: "no-store" });
}

export async function getCardSymbols(): Promise<ScryfallCardSymbol[]> {
  const response = await scryfall<{ data: ScryfallCardSymbol[] }>(
    "/symbology",
    { revalidate: 86400 },
  );

  return response.data;
}

export async function autocomplete(query: string): Promise<{ data: string[] }> {
  const encoded = encodeURIComponent(query);
  return scryfall<{ data: string[] }>(`/cards/autocomplete?q=${encoded}`);
}

export function getCardImage(
  card: ScryfallCard,
  size: "small" | "normal" | "large" | "png" | "art_crop" = "normal",
): string {
  if (card.image_uris) {
    return card.image_uris[size];
  }
  if (card.card_faces && card.card_faces[0]?.image_uris) {
    return card.card_faces[0].image_uris[size];
  }
  return "";
}

export function formatManaCost(manaCost: string | undefined): string[] {
  if (!manaCost) return [];
  const symbols = manaCost.match(/\{[^}]+\}/g);
  return symbols || [];
}

const RARITY_COLORS: Record<string, string> = {
  common: "#8b949e",
  uncommon: "#c0c0c0",
  rare: "#d4af37",
  mythic: "#e05d44",
  special: "#9b59b6",
  bonus: "#9b59b6",
};

export function getRarityColor(rarity: string): string {
  return RARITY_COLORS[rarity] || "#8b949e";
}
