import type {
  RuntimeModelClient,
  RuntimeModelRequest,
  RuntimeModelResponse,
} from "../runtime/agent-runtime.js";
import type { RuntimeModelClientFactoryEnv } from "./types.js";

export interface OpenAIResponsesModelClientOptions {
  apiKey: string;
  baseUrl?: string;
  model: string;
  timeoutMs?: number;
  enforceJsonResponse?: boolean;
}

interface OpenAIResponsesUsage {
  input_tokens?: number;
  output_tokens?: number;
}

interface OpenAIResponsesContentItem {
  type?: string;
  text?: string;
}

interface OpenAIResponsesOutputItem {
  type?: string;
  content?: OpenAIResponsesContentItem[];
}

interface OpenAIResponsesResponse {
  model?: string;
  status?: string;
  output_text?: string;
  output?: OpenAIResponsesOutputItem[];
  usage?: OpenAIResponsesUsage;
  incomplete_details?: {
    reason?: string | null;
  };
}

const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_OPENAI_MODEL = "gpt-5.4";
const DEFAULT_TIMEOUT_MS = 30_000;

const toEndpoint = (baseUrl: string) => {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
  return `${normalizedBaseUrl}/responses`;
};

const resolveFinishReason = (
  payload: OpenAIResponsesResponse,
): NonNullable<RuntimeModelResponse["finishReason"]> => {
  const incompleteReason = payload.incomplete_details?.reason ?? undefined;
  if (
    incompleteReason === "max_output_tokens" ||
    incompleteReason === "max_tokens"
  ) {
    return "length";
  }

  if (payload.status === "completed") {
    return "stop";
  }

  if (payload.status === "incomplete" && incompleteReason) {
    return "error";
  }

  if (typeof payload.output_text === "string" && payload.output_text.length > 0) {
    return "stop";
  }

  return "error";
};

const extractOutputText = (payload: OpenAIResponsesResponse): string => {
  if (typeof payload.output_text === "string" && payload.output_text.length > 0) {
    return payload.output_text;
  }

  if (!Array.isArray(payload.output)) {
    return "";
  }

  const chunks: string[] = [];
  for (const item of payload.output) {
    if (!Array.isArray(item.content)) {
      continue;
    }

    for (const contentItem of item.content) {
      if (typeof contentItem.text === "string" && contentItem.text.length > 0) {
        chunks.push(contentItem.text);
      }
    }
  }

  return chunks.join("\n");
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

export class OpenAIResponsesModelClient implements RuntimeModelClient {
  readonly #options: OpenAIResponsesModelClientOptions;

  constructor(options: OpenAIResponsesModelClientOptions) {
    this.#options = options;
  }

  async generate(request: RuntimeModelRequest): Promise<RuntimeModelResponse> {
    const startedAt = Date.now();
    const timeoutMs = this.#options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(
        toEndpoint(this.#options.baseUrl ?? DEFAULT_OPENAI_BASE_URL),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.#options.apiKey}`,
          },
          body: JSON.stringify({
            model: this.#options.model,
            input: request.prompt,
            max_output_tokens: request.maxOutputTokens,
            ...(this.#options.enforceJsonResponse === false
              ? {}
              : { text: { format: { type: "json_object" } } }),
          }),
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI Responses API error: ${response.status} - ${error}`);
      }

      const payload = (await response.json()) as OpenAIResponsesResponse;

      return {
        text: extractOutputText(payload),
        finishReason: resolveFinishReason(payload),
        model: payload.model,
        latencyMs: Date.now() - startedAt,
        promptTokens: payload.usage?.input_tokens,
        completionTokens: payload.usage?.output_tokens,
      };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`OpenAI Responses API timeout after ${timeoutMs}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
}

export const createOpenAIResponsesModelClient = (
  env: RuntimeModelClientFactoryEnv,
): RuntimeModelClient => {
  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required for OpenAI provider.");
  }

  const timeoutMs = parseTimeout(env.RUNTIME_MODEL_TIMEOUT_MS);

  const options: OpenAIResponsesModelClientOptions = {
    apiKey,
    baseUrl: env.OPENAI_BASE_URL ?? DEFAULT_OPENAI_BASE_URL,
    model: env.OPENAI_MODEL_CHAT ?? DEFAULT_OPENAI_MODEL,
    enforceJsonResponse: true,
  };
  if (timeoutMs !== undefined) {
    options.timeoutMs = timeoutMs;
  }

  return new OpenAIResponsesModelClient(options);
};
