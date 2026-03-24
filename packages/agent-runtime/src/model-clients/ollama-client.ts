import type {
  RuntimeModelClient,
  RuntimeModelRequest,
  RuntimeModelResponse,
} from "../runtime/agent-runtime.js";
import type { RuntimeModelClientFactoryEnv } from "./types.js";

export interface OllamaModelClientOptions {
  baseUrl?: string;
  model: string;
  timeoutMs?: number;
}

interface OllamaGenerateResponse {
  model?: string;
  response?: string;
  done_reason?: string;
  prompt_eval_count?: number;
  eval_count?: number;
}

const DEFAULT_OLLAMA_BASE_URL = "http://localhost:11434";
const DEFAULT_OLLAMA_MODEL = "qwen2.5:14b";
const DEFAULT_TIMEOUT_MS = 30_000;

const toEndpoint = (baseUrl: string) => {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
  return `${normalizedBaseUrl}/api/generate`;
};

const parseTimeout = (raw: string | undefined): number | undefined => {
  if (!raw) {
    return undefined;
  }

  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return undefined;
  }

  return parsed;
};

const resolveFinishReason = (
  doneReason: string | undefined,
): NonNullable<RuntimeModelResponse["finishReason"]> => {
  if (doneReason === "stop") {
    return "stop";
  }

  if (doneReason === "length") {
    return "length";
  }

  if (!doneReason) {
    return "stop";
  }

  return "error";
};

export class OllamaModelClient implements RuntimeModelClient {
  readonly #options: OllamaModelClientOptions;

  constructor(options: OllamaModelClientOptions) {
    this.#options = options;
  }

  async generate(request: RuntimeModelRequest): Promise<RuntimeModelResponse> {
    const startedAt = Date.now();
    const timeoutMs = this.#options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(
        toEndpoint(this.#options.baseUrl ?? DEFAULT_OLLAMA_BASE_URL),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: this.#options.model,
            prompt: request.prompt,
            stream: false,
            options: {
              num_predict: request.maxOutputTokens,
            },
          }),
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Ollama API error: ${response.status} - ${error}`);
      }

      const payload = (await response.json()) as OllamaGenerateResponse;

      return {
        text: payload.response ?? "",
        finishReason: resolveFinishReason(payload.done_reason),
        model: payload.model,
        latencyMs: Date.now() - startedAt,
        promptTokens: payload.prompt_eval_count,
        completionTokens: payload.eval_count,
      };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`Ollama API timeout after ${timeoutMs}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
}

export const createOllamaModelClient = (
  env: RuntimeModelClientFactoryEnv,
): RuntimeModelClient => {
  const timeoutMs = parseTimeout(env.RUNTIME_MODEL_TIMEOUT_MS);

  const options: OllamaModelClientOptions = {
    baseUrl: env.OLLAMA_BASE_URL ?? DEFAULT_OLLAMA_BASE_URL,
    model: env.OLLAMA_MODEL_CHAT ?? DEFAULT_OLLAMA_MODEL,
  };
  if (timeoutMs !== undefined) {
    options.timeoutMs = timeoutMs;
  }

  return new OllamaModelClient(options);
};
