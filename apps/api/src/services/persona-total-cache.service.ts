import { createClient } from "redis";

const DEFAULT_CACHE_KEY = "plaza:personas:active_total:v1";
const DEFAULT_CACHE_TTL_SECONDS = 60;

export interface PersonaTotalCache {
  getActiveTotal(): Promise<number | null>;
  setActiveTotal(total: number): Promise<void>;
  invalidateActiveTotal(): Promise<void>;
}

interface RedisCacheClient {
  get(key: string): Promise<string | null>;
  set(
    key: string,
    value: string,
    options?: { EX?: number },
  ): Promise<unknown>;
  del(key: string): Promise<number>;
  on(event: "error", listener: (error: unknown) => void): unknown;
  connect(): Promise<unknown>;
}

interface RedisPersonaTotalCacheOptions {
  redisUrl: string;
  ttlSeconds?: number;
  key?: string;
}

export class RedisPersonaTotalCache implements PersonaTotalCache {
  readonly #client: RedisCacheClient;
  readonly #key: string;
  readonly #ttlSeconds: number;

  constructor(
    client: RedisCacheClient,
    options: { ttlSeconds?: number; key?: string } = {},
  ) {
    this.#client = client;
    this.#key = options.key ?? DEFAULT_CACHE_KEY;
    this.#ttlSeconds = Math.max(
      1,
      options.ttlSeconds ?? DEFAULT_CACHE_TTL_SECONDS,
    );
  }

  async getActiveTotal(): Promise<number | null> {
    try {
      const value = await this.#client.get(this.#key);
      if (!value) {
        return null;
      }

      const parsed = Number.parseInt(value, 10);
      if (!Number.isFinite(parsed) || parsed < 0) {
        return null;
      }

      return parsed;
    } catch {
      return null;
    }
  }

  async setActiveTotal(total: number): Promise<void> {
    if (!Number.isFinite(total) || total < 0) {
      return;
    }

    try {
      await this.#client.set(this.#key, String(total), {
        EX: this.#ttlSeconds,
      });
    } catch {
      // Ignore cache write errors and rely on database as source of truth.
    }
  }

  async invalidateActiveTotal(): Promise<void> {
    try {
      await this.#client.del(this.#key);
    } catch {
      // Ignore cache invalidation errors and rely on TTL fallback.
    }
  }
}

export const createRedisPersonaTotalCache = (
  options: RedisPersonaTotalCacheOptions,
): PersonaTotalCache => {
  const client = createClient({
    url: options.redisUrl,
    socket: {
      connectTimeout: 500,
      reconnectStrategy: false,
    },
  });
  let hasLoggedError = false;
  const logRedisErrorOnce = (code: string, error: unknown) => {
    if (hasLoggedError) {
      return;
    }
    hasLoggedError = true;

    console.warn(
      `[cache] ${code}`,
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
      }),
    );
  };

  client.on("error", (error) => {
    logRedisErrorOnce("persona_total_cache_redis_error", error);
  });

  void client.connect().catch((error) => {
    logRedisErrorOnce("persona_total_cache_redis_connect_failed", error);
  });

  const cacheOptions: { ttlSeconds?: number; key?: string } = {};
  if (options.ttlSeconds !== undefined) {
    cacheOptions.ttlSeconds = options.ttlSeconds;
  }
  if (options.key !== undefined) {
    cacheOptions.key = options.key;
  }

  return new RedisPersonaTotalCache(client, cacheOptions);
};
