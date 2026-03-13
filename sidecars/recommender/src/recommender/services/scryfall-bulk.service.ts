import { Injectable } from '@nestjs/common';

interface ScryfallBulkDataIndexItem {
  type: string;
  download_uri: string;
}

interface ScryfallBulkDataIndexResponse {
  data: ScryfallBulkDataIndexItem[];
}

interface ScryfallFace {
  image_uris?: {
    normal?: string;
  };
}

export interface ScryfallBulkCard {
  id: string;
  name: string;
  oracle_text?: string;
  flavor_text?: string;
  image_uris?: {
    normal?: string;
  };
  card_faces?: ScryfallFace[];
  scryfall_uri: string;
  set: string;
  set_name?: string;
  collector_number?: string;
  artist?: string;
  rarity?: string;
  mana_cost?: string;
  color_identity?: string[];
  type_line?: string;
  digital?: boolean;
}

@Injectable()
export class ScryfallBulkService {
  async fetchDefaultCards(limit?: number): Promise<ScryfallBulkCard[]> {
    const indexRes = await fetch('https://api.scryfall.com/bulk-data', {
      headers: { Accept: 'application/json' },
    });
    if (!indexRes.ok) {
      throw new Error(
        `Failed to fetch Scryfall bulk index: ${indexRes.status}`,
      );
    }

    const index = (await indexRes.json()) as ScryfallBulkDataIndexResponse;
    const defaultCards = index.data.find(
      (item) => item.type === 'default_cards',
    );

    if (!defaultCards) {
      throw new Error('Scryfall bulk index did not include default_cards');
    }

    const cardsRes = await fetch(defaultCards.download_uri, {
      headers: { Accept: 'application/json' },
    });
    if (!cardsRes.ok) {
      throw new Error(
        `Failed to download Scryfall default cards: ${cardsRes.status}`,
      );
    }

    const cards = (await cardsRes.json()) as ScryfallBulkCard[];
    const filtered = cards.filter(
      (card) =>
        Boolean(card.id) &&
        Boolean(card.name) &&
        Boolean(card.scryfall_uri) &&
        !card.digital,
    );

    if (!limit) {
      return filtered;
    }
    return filtered.slice(0, limit);
  }
}
