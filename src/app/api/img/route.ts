import { NextRequest, NextResponse } from "next/server";

// Only proxy images from the official Scryfall image CDN (SSRF guard).
const ALLOWED_HOST = "cards.scryfall.io";
const FETCH_TIMEOUT_MS = 10_000;
const CACHE_MAX_AGE = 2_592_000; // 30 days in seconds

// In-memory single-flight map: concurrent requests for the same URL share one
// in-flight upstream fetch instead of all hammering Scryfall simultaneously.
const inflight = new Map<string, Promise<Response>>();

export async function GET(req: NextRequest): Promise<NextResponse> {
  const raw = req.nextUrl.searchParams.get("url");

  if (!raw) {
    return new NextResponse("Missing url parameter", { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return new NextResponse("Invalid url parameter", { status: 400 });
  }

  // SSRF guard: reject anything that isn't the Scryfall image CDN over HTTPS.
  if (parsed.protocol !== "https:" || parsed.hostname !== ALLOWED_HOST) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const cacheKey = parsed.href;

  let pending = inflight.get(cacheKey);
  if (!pending) {
    pending = fetchWithTimeout(parsed.href, FETCH_TIMEOUT_MS);
    inflight.set(cacheKey, pending);
    pending.finally(() => inflight.delete(cacheKey));
  }

  let upstream: Response;
  try {
    upstream = await pending;
  } catch {
    return new NextResponse("Failed to fetch image from upstream", {
      status: 502,
    });
  }

  if (!upstream.ok) {
    return new NextResponse("Upstream error", { status: upstream.status });
  }

  const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
  const body = await upstream.arrayBuffer();

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": `public, max-age=${CACHE_MAX_AGE}, immutable`,
    },
  });
}

async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "image/*" },
    });
  } finally {
    clearTimeout(timeout);
  }
}
