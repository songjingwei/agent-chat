import type { RuntimeModelClient } from "../runtime/agent-runtime.js";
import {
  createAnthropicModelClient,
} from "./anthropic-client.js";
import {
  createOllamaModelClient,
} from "./ollama-client.js";
import {
  createOpenAIResponsesModelClient,
} from "./openai-responses-client.js";
import type {
  RuntimeModelClientFactoryEnv,
  RuntimeModelProvider,
} from "./types.js";

const DEFAULT_PROVIDER: RuntimeModelProvider = "openai";

const toProvider = (raw: string | undefined): RuntimeModelProvider => {
  const normalized = raw?.trim().toLowerCase();
  if (!normalized) {
    return DEFAULT_PROVIDER;
  }

  if (
    normalized === "openai" ||
    normalized === "anthropic" ||
    normalized === "ollama"
  ) {
    return normalized;
  }

  throw new Error(`Unsupported RUNTIME_MODEL_PROVIDER: ${raw}`);
};

export const createRuntimeModelClient = (
  env: RuntimeModelClientFactoryEnv,
): RuntimeModelClient => {
  const provider = toProvider(env.RUNTIME_MODEL_PROVIDER);

  if (provider === "openai") {
    return createOpenAIResponsesModelClient(env);
  }

  if (provider === "anthropic") {
    return createAnthropicModelClient(env);
  }

  return createOllamaModelClient(env);
};

export const resolveRuntimeModelProvider = (
  raw: string | undefined,
): RuntimeModelProvider => {
  return toProvider(raw);
};
