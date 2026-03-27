import type { ConnectionOptions } from "bullmq";

const DEFAULT_REDIS_URL = "redis://localhost:6379";

const parseRedisUrl = (url: string): ConnectionOptions => {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: Number(parsed.port) || 6379,
    password: parsed.password || undefined,
    username: parsed.username || undefined,
    maxRetriesPerRequest: null,
  };
};

export const redisConnection: ConnectionOptions = parseRedisUrl(
  process.env.REDIS_URL ?? DEFAULT_REDIS_URL,
);
