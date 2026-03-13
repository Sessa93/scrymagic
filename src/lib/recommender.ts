export type RecommendedCard = {
  card_id: string;
  name: string;
  oracle_text: string | null;
  flavor_text: string | null;
  image_uri: string | null;
  scryfall_uri: string;
  set_code: string;
  collector_number: string | null;
  distance: number;
  score: number;
};

type RecommenderResponse = {
  data: RecommendedCard[];
};

const RECOMMENDER_API_BASE_URL =
  process.env.RECOMMENDER_API_BASE_URL ?? "http://127.0.0.1:3001";

async function recommenderPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${RECOMMENDER_API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
    next: { revalidate: 1800 },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Recommender API error: ${res.status} ${text}`);
  }

  return (await res.json()) as T;
}

export async function getVisualRecommendations(
  cardId: string,
  limit: number = 10,
): Promise<RecommendedCard[]> {
  const response = await recommenderPost<RecommenderResponse>(
    "/api/recommender/recommend/visual",
    { cardId, limit },
  );
  return response.data ?? [];
}

export async function getOracleRecommendations(
  query: string,
  excludeCardId: string,
  limit: number = 10,
): Promise<RecommendedCard[]> {
  const response = await recommenderPost<RecommenderResponse>(
    "/api/recommender/recommend/oracle",
    { query, excludeCardId, limit },
  );
  return response.data ?? [];
}
