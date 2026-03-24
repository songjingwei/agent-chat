import type { RuntimeModelClient } from "../runtime/agent-runtime.js";

export type RuntimeModelProvider = "openai" | "anthropic" | "ollama";

export interface RuntimeModelClientFactoryEnv {
  RUNTIME_MODEL_PROVIDER?: string | undefined;
  RUNTIME_MODEL_TIMEOUT_MS?: string | undefined;

  OPENAI_API_KEY?: string | undefined;
  OPENAI_BASE_URL?: string | undefined;
  OPENAI_MODEL_CHAT?: string | undefined;
  OPENAI_RESPONSES_STREAM?: string | undefined;

  ANTHROPIC_API_KEY?: string | undefined;
  ANTHROPIC_BASE_URL?: string | undefined;
  ANTHROPIC_MODEL_CHAT?: string | undefined;

  OLLAMA_BASE_URL?: string | undefined;
  OLLAMA_MODEL_CHAT?: string | undefined;
}

export type CreateRuntimeModelClient = (
  env: RuntimeModelClientFactoryEnv,
) => RuntimeModelClient;
