import { ScryfallSet, scryfall } from "@/lib/scryfall";

export async function getAllSets(): Promise<ScryfallSet[]> {
  // Scryfall returns sets sorted by release date descending
  const res = await scryfall<{ data: ScryfallSet[] }>("/sets");
  return res.data;
}

export async function getSetByCode(code: string): Promise<ScryfallSet> {
  return scryfall<ScryfallSet>(`/sets/${code}`);
}
