import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";

const configDir = dirname(fileURLToPath(import.meta.url));
const envLocalPath = resolve(configDir, "../../../.env.local");
const envPath = resolve(configDir, "../../../.env");

if (existsSync(envLocalPath)) {
  loadEnvFile(envLocalPath);
}

if (existsSync(envPath)) {
  loadEnvFile(envPath);
}

const parsePositiveInt = (
  value: string | undefined,
  fallback: number,
): number => {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
};

export const workerConfig = {
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  queuePrefix: process.env.QUEUE_PREFIX ?? "agent-chat",
  concurrency: parsePositiveInt(process.env.WORKER_CONCURRENCY, 1),
  sessionTimeoutMs: parsePositiveInt(
    process.env.WORKER_SESSION_TIMEOUT_MS,
    5 * 60 * 1_000,
  ),
} as const;
