import "server-only";

import { deleteRedisKey, incrementInRedis } from "@/lib/redis";

type HeaderMap = Headers | Record<string, string | string[] | undefined>;

type RateLimitInput = {
  scope: string;
  identifier: string;
  limit: number;
  windowSeconds: number;
};

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
};

function sanitizeIdentifier(input: string): string {
  return input.trim().toLowerCase().replace(/[^a-z0-9:_@.-]/g, "_");
}

function readHeader(headers: HeaderMap | undefined, key: string): string | null {
  if (!headers) {
    return null;
  }

  if (headers instanceof Headers) {
    return headers.get(key);
  }

  const value = headers[key] ?? headers[key.toLowerCase()];
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

export function extractClientIp(headers: HeaderMap | undefined): string {
  const forwardedFor = readHeader(headers, "x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  const realIp = readHeader(headers, "x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  return "unknown";
}

function buildRateLimitKey(scope: string, identifier: string): string {
  return `rl:${sanitizeIdentifier(scope)}:${sanitizeIdentifier(identifier)}`;
}

export async function consumeRateLimit({
  scope,
  identifier,
  limit,
  windowSeconds,
}: RateLimitInput): Promise<RateLimitResult> {
  const key = buildRateLimitKey(scope, identifier);
  const incremented = await incrementInRedis(key, windowSeconds);

  // Fail open when Redis is unavailable.
  if (!incremented) {
    return {
      allowed: true,
      limit,
      remaining: limit,
      retryAfterSeconds: 0,
    };
  }

  return {
    allowed: incremented.value <= limit,
    limit,
    remaining: Math.max(limit - incremented.value, 0),
    retryAfterSeconds: incremented.ttlSeconds,
  };
}

export async function clearRateLimit(scope: string, identifier: string): Promise<void> {
  const key = buildRateLimitKey(scope, identifier);
  await deleteRedisKey(key);
}
