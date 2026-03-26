import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";

import { DEFAULT_SESSION_MAX_ROUNDS } from "@agent/db";

const configDir = dirname(fileURLToPath(import.meta.url));
const envLocalPath = resolve(configDir, "../../../.env.local");
const envPath = resolve(configDir, "../../../.env");

if (existsSync(envLocalPath)) {
  loadEnvFile(envLocalPath);
}

if (existsSync(envPath)) {
  loadEnvFile(envPath);
}

const DEFAULT_PORT = 3001;
const DEFAULT_APP_ORIGIN = "http://localhost:3000";
const DEFAULT_DATABASE_URL = "postgres://postgres:postgres@localhost:5432/agent_chat";
const DEFAULT_REDIS_URL = "redis://localhost:6379";
const DEFAULT_HEALTHCHECK_TIMEOUT_MS = 1000;
const DEFAULT_RUNTIME_MODEL_PROVIDER = "openai";
const DEFAULT_RUNTIME_MODEL_TIMEOUT_MS = 30_000;
const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_OPENAI_MODEL_CHAT = "gpt-5.4";
const DEFAULT_ANTHROPIC_BASE_URL = "https://api.anthropic.com/v1";
const DEFAULT_ANTHROPIC_MODEL_CHAT = "claude-sonnet-4-5";
const DEFAULT_OLLAMA_BASE_URL = "http://localhost:11434";
const DEFAULT_OLLAMA_MODEL_CHAT = "qwen2.5:14b";

const parsePort = (value: string | undefined): number => {
  if (!value) {
    return DEFAULT_PORT;
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return DEFAULT_PORT;
  }

  return parsed;
};

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

const parseRuntimeModelProvider = (value: string | undefined): string => {
  if (!value) {
    return DEFAULT_RUNTIME_MODEL_PROVIDER;
  }

  const normalized = value.trim().toLowerCase();
  if (
    normalized === "openai" ||
    normalized === "anthropic" ||
    normalized === "ollama"
  ) {
    return normalized;
  }

  return DEFAULT_RUNTIME_MODEL_PROVIDER;
};

export const apiConfig = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: parsePort(process.env.PORT),
  serviceName: "agent-api",
  appOrigin: process.env.APP_ORIGIN ?? DEFAULT_APP_ORIGIN,
  adminOrigin: process.env.ADMIN_ORIGIN ?? "http://localhost:3002",
  databaseUrl: process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL,
  redisUrl: process.env.REDIS_URL ?? DEFAULT_REDIS_URL,
  healthcheckTimeoutMs: parsePositiveInt(
    process.env.HEALTHCHECK_TIMEOUT_MS,
    DEFAULT_HEALTHCHECK_TIMEOUT_MS,
  ),
  jwtSecret: process.env.JWT_SECRET ?? "dev-jwt-secret-change-in-production",
  jwtAccessExpiresIn: parsePositiveInt(process.env.JWT_ACCESS_EXPIRES_IN, 900),
  jwtRefreshExpiresIn: parsePositiveInt(
    process.env.JWT_REFRESH_EXPIRES_IN,
    604800,
  ),
  sessionMaxRounds: parsePositiveInt(
    process.env.SESSION_MAX_ROUNDS,
    DEFAULT_SESSION_MAX_ROUNDS,
  ),
  runtimeModelProvider: parseRuntimeModelProvider(
    process.env.RUNTIME_MODEL_PROVIDER,
  ),
  runtimeModelTimeoutMs: parsePositiveInt(
    process.env.RUNTIME_MODEL_TIMEOUT_MS,
    DEFAULT_RUNTIME_MODEL_TIMEOUT_MS,
  ),
  openAIApiKey: process.env.OPENAI_API_KEY,
  openAIBaseUrl: process.env.OPENAI_BASE_URL ?? DEFAULT_OPENAI_BASE_URL,
  openAIModelChat: process.env.OPENAI_MODEL_CHAT ?? DEFAULT_OPENAI_MODEL_CHAT,
  openAIResponsesStream: process.env.OPENAI_RESPONSES_STREAM,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  anthropicBaseUrl: process.env.ANTHROPIC_BASE_URL ?? DEFAULT_ANTHROPIC_BASE_URL,
  anthropicModelChat:
    process.env.ANTHROPIC_MODEL_CHAT ?? DEFAULT_ANTHROPIC_MODEL_CHAT,
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL ?? DEFAULT_OLLAMA_BASE_URL,
  ollamaModelChat: process.env.OLLAMA_MODEL_CHAT ?? DEFAULT_OLLAMA_MODEL_CHAT,
} as const;
