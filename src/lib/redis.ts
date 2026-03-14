import "server-only";

import { createClient } from "redis";

const DEFAULT_REDIS_URL = "redis://127.0.0.1:6379";

type AppRedisClient = ReturnType<typeof createClient>;

declare global {
  var redisClient: AppRedisClient | undefined;
  var redisClientPromise: Promise<AppRedisClient> | undefined;
  var redisWarningLogged: boolean | undefined;
}

function logRedisWarning(error: unknown) {
  if (globalThis.redisWarningLogged) {
    return;
  }

  globalThis.redisWarningLogged = true;
  console.warn(
    "Redis cache unavailable, falling back to direct Scryfall fetches.",
    error,
  );
}

async function getRedisClient(): Promise<AppRedisClient> {
  if (globalThis.redisClient?.isOpen) {
    return globalThis.redisClient;
  }

  if (!globalThis.redisClientPromise) {
    const client = createClient({
      url: process.env.REDIS_URL ?? DEFAULT_REDIS_URL,
      socket: {
        connectTimeout: 2000,
        reconnectStrategy: false,
      },
    });

    globalThis.redisClientPromise = client
      .connect()
      .then(() => {
        globalThis.redisClient = client;
        return client;
      })
      .catch((error) => {
        globalThis.redisClientPromise = undefined;
        globalThis.redisClient = undefined;
        client.destroy();
        throw error;
      });
  }

  return globalThis.redisClientPromise;
}

export async function getJsonFromRedis<T>(key: string): Promise<T | null> {
  try {
    const client = await getRedisClient();
    const cached = await client.get(key);

    if (!cached) {
      return null;
    }

    return JSON.parse(cached) as T;
  } catch (error) {
    logRedisWarning(error);
    return null;
  }
}

export async function setJsonInRedis<T>(
  key: string,
  value: T,
  ttlSeconds: number,
): Promise<void> {
  try {
    const client = await getRedisClient();
    await client.set(key, JSON.stringify(value), { EX: ttlSeconds });
  } catch (error) {
    logRedisWarning(error);
  }
}

export async function incrementInRedis(
  key: string,
  ttlSeconds: number,
): Promise<{ value: number; ttlSeconds: number } | null> {
  try {
    const client = await getRedisClient();
    const value = await client.incr(key);
    if (value === 1) {
      await client.expire(key, ttlSeconds);
    }

    const ttl = await client.ttl(key);
    return {
      value,
      ttlSeconds: ttl > 0 ? ttl : ttlSeconds,
    };
  } catch (error) {
    logRedisWarning(error);
    return null;
  }
}

export async function deleteRedisKey(key: string): Promise<void> {
  try {
    const client = await getRedisClient();
    await client.del(key);
  } catch (error) {
    logRedisWarning(error);
  }
}
