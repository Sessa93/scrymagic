import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

const OPENAI_MODEL = "gpt-4.1";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MAX_RETRIES = 3;
const OPENAI_RETRY_DELAY_MS = 350;

const SYSTEM_PROMPT = `You are an expert in Scryfall's search syntax for Magic: The Gathering cards.
Your task is to translate a natural language query into a valid Scryfall syntax query.

Scryfall syntax reference (key operators):
- t:<type>          card type or subtype, e.g. t:creature t:elf
- c:<color>         color: w u b r g (can combine: c:wu for white-blue)
- c:<identity>      color identity: id:wu
- o:<text>          oracle text contains text, e.g. o:"draw a card"
- pow>=<n>          power comparison: pow>=4 tou<=2
- cmc=<n>           converted mana cost (also spelled mv=): cmc=3
- mana:{symbol}     mana cost includes symbol, e.g. mana:{R}{R}
- r:<rarity>        rarity: common uncommon rare mythic
- s:<set>           set code: s:neo
- e:<edition>       same as s:
- a:<artist>        artist name
- year=<yyyy>       release year
- f:<format>        legal in format: f:standard f:modern
- is:spell          card is a spell (not land)
- is:commander      usable as commander
- is:extra          extra cards
- not:funny         excludes Un-sets
- -<operator>       negate: -t:land
- (<query>) or (<q1>) or (<q2>)   boolean combinations

Return ONLY the Scryfall query string, no explanation, no quotes, no markdown.
If the input already looks like Scryfall syntax, return it unchanged.`;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(req: NextRequest) {
  if (!OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured" },
      { status: 500 },
    );
  }

  let body: { query?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const naturalQuery = (body.query ?? "").trim();
  if (!naturalQuery) {
    return NextResponse.json({ error: "Empty query" }, { status: 400 });
  }

  const client = new OpenAI({ apiKey: OPENAI_API_KEY });

  let lastError: unknown;

  for (let attempt = 1; attempt <= OPENAI_MAX_RETRIES; attempt += 1) {
    try {
      const completion = await client.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: naturalQuery },
        ],
        temperature: 0,
        max_tokens: 1000,
      });

      const translated =
        completion.choices[0]?.message?.content?.trim() ?? naturalQuery;
      console.log(`Translated query: "${naturalQuery}" -> "${translated}"`);
      return NextResponse.json({ translated });
    } catch (err) {
      lastError = err;
      if (attempt < OPENAI_MAX_RETRIES) {
        const backoffMs = OPENAI_RETRY_DELAY_MS * 2 ** (attempt - 1);
        await sleep(backoffMs);
      }
    }
  }

  const message =
    lastError instanceof Error ? lastError.message : "OpenAI request failed";
  console.error(
    `Error translating query after ${OPENAI_MAX_RETRIES} attempts:`,
    message,
  );
  return NextResponse.json(
    { error: message, retriesAttempted: OPENAI_MAX_RETRIES },
    { status: 502 },
  );
}
