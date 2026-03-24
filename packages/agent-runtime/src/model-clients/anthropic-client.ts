import type {
  RuntimeModelClient,
  RuntimeModelRequest,
  RuntimeModelResponse,
} from "../runtime/agent-runtime.js";
import type { RuntimeModelClientFactoryEnv } from "./types.js";

export interface AnthropicModelClientOptions {
  apiKey: string;
  baseUrl?: string;
  model: string;
  timeoutMs?: number;
  anthropicVersion?: string;
}

interface AnthropicContentBlock {
  type?: string;
  text?: string;
}

interface AnthropicMessageResponse {
  model?: string;
  stop_reason?: string | null;
  content?: AnthropicContentBlock[];
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
}

const DEFAULT_ANTHROPIC_BASE_URL = "https://api.anthropic.com/v1";
const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-5";
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_ANTHROPIC_VERSION = "2023-06-01";

const toEndpoint = (baseUrl: string) => {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
  return `${normalizedBaseUrl}/messages`;
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
  stopReason: string | null | undefined,
): NonNullable<RuntimeModelResponse["finishReason"]> => {
  if (stopReason === "end_turn" || stopReason === "stop_sequence") {
    return "stop";
  }

  if (stopReason === "max_tokens") {
    return "length";
  }

  if (!stopReason) {
    return "stop";
  }

  return "error";
};

const extractText = (payload: AnthropicMessageResponse): string => {
  if (!Array.isArray(payload.content)) {
    return "";
  }

  const chunks: string[] = [];
  for (const block of payload.content) {
    if (block.type !== "text") {
      continue;
    }

    if (typeof block.text === "string" && block.text.length > 0) {
      chunks.push(block.text);
    }
  }

  return chunks.join("\n");
};

export class AnthropicModelClient implements RuntimeModelClient {
  readonly #options: AnthropicModelClientOptions;

  constructor(options: AnthropicModelClientOptions) {
    this.#options = options;
  }

  async generate(request: RuntimeModelRequest): Promise<RuntimeModelResponse> {
    const startedAt = Date.now();
    const timeoutMs = this.#options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(
        toEndpoint(this.#options.baseUrl ?? DEFAULT_ANTHROPIC_BASE_URL),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": this.#options.apiKey,
            "anthropic-version":
              this.#options.anthropicVersion ?? DEFAULT_ANTHROPIC_VERSION,
          },
          body: JSON.stringify({
            model: this.#options.model,
            max_tokens: request.maxOutputTokens,
            messages: [{ role: "user", content: request.prompt }],
          }),
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Anthropic API error: ${response.status} - ${error}`);
      }

      const payload = (await response.json()) as AnthropicMessageResponse;

      return {
        text: extractText(payload),
        finishReason: resolveFinishReason(payload.stop_reason),
        model: payload.model,
        latencyMs: Date.now() - startedAt,
        promptTokens: payload.usage?.input_tokens,
        completionTokens: payload.usage?.output_tokens,
      };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`Anthropic API timeout after ${timeoutMs}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
}

export const createAnthropicModelClient = (
  env: RuntimeModelClientFactoryEnv,
): RuntimeModelClient => {
  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is required for Anthropic provider.");
  }

  const timeoutMs = parseTimeout(env.RUNTIME_MODEL_TIMEOUT_MS);

  const options: AnthropicModelClientOptions = {
    apiKey,
    baseUrl: env.ANTHROPIC_BASE_URL ?? DEFAULT_ANTHROPIC_BASE_URL,
    model: env.ANTHROPIC_MODEL_CHAT ?? DEFAULT_ANTHROPIC_MODEL,
  };
  if (timeoutMs !== undefined) {
    options.timeoutMs = timeoutMs;
  }

  return new AnthropicModelClient(options);
};
