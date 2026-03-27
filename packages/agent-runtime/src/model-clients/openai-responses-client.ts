import type {
  RuntimeModelClient,
  RuntimeModelRequest,
  RuntimeModelResponse,
} from "../runtime/agent-runtime.js";
import { RuntimeStructuredOutputJsonSchema } from "../schemas/structured-output.js";
import type { RuntimeModelClientFactoryEnv } from "./types.js";

export interface OpenAIResponsesModelClientOptions {
  apiKey: string;
  baseUrl?: string;
  model: string;
  timeoutMs?: number;
  enforceJsonResponse?: boolean;
  enableStreaming?: boolean;
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

interface OpenAIStreamState {
  hasDeltaText: boolean;
  deltaChunks: string[];
  fallbackText: string;
  finishReason?: NonNullable<RuntimeModelResponse["finishReason"]>;
  model?: string;
  promptTokens?: number;
  completionTokens?: number;
  completedPayload?: OpenAIResponsesResponse;
}

const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_OPENAI_MODEL = "gpt-5.4";
const DEFAULT_TIMEOUT_MS = 30_000;
const RUNTIME_OUTPUT_SCHEMA_NAME = "runtime_structured_output";

const toEndpoint = (baseUrl: string) => {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
  return `${normalizedBaseUrl}/responses`;
};

const mapRawFinishReason = (
  raw: string | null | undefined,
): NonNullable<RuntimeModelResponse["finishReason"]> | undefined => {
  if (!raw) {
    return undefined;
  }

  const normalized = raw.toLowerCase();
  if (
    normalized === "stop" ||
    normalized === "completed" ||
    normalized === "end_turn" ||
    normalized === "stop_sequence"
  ) {
    return "stop";
  }

  if (
    normalized === "length" ||
    normalized === "max_tokens" ||
    normalized === "max_output_tokens"
  ) {
    return "length";
  }

  return "error";
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

const parseBoolean = (raw: string | undefined): boolean | undefined => {
  if (!raw) {
    return undefined;
  }

  const normalized = raw.trim().toLowerCase();
  if (normalized === "true" || normalized === "1" || normalized === "yes") {
    return true;
  }

  if (normalized === "false" || normalized === "0" || normalized === "no") {
    return false;
  }

  return undefined;
};

const pushDeltaText = (state: OpenAIStreamState, text: unknown) => {
  if (typeof text !== "string" || text.length === 0) {
    return;
  }

  state.hasDeltaText = true;
  state.deltaChunks.push(text);
};

const pushFallbackText = (state: OpenAIStreamState, text: unknown) => {
  if (state.hasDeltaText) {
    return;
  }

  if (typeof text !== "string" || text.length === 0) {
    return;
  }

  state.fallbackText += text;
};

const updateUsageAndModel = (
  state: OpenAIStreamState,
  payload: Record<string, unknown>,
) => {
  const model = payload.model;
  if (typeof model === "string" && model.length > 0) {
    state.model = model;
  }

  const usage = payload.usage;
  if (usage && typeof usage === "object") {
    const usageRecord = usage as Record<string, unknown>;
    if (typeof usageRecord.input_tokens === "number") {
      state.promptTokens = usageRecord.input_tokens;
    }
    if (typeof usageRecord.output_tokens === "number") {
      state.completionTokens = usageRecord.output_tokens;
    }
    if (typeof usageRecord.prompt_tokens === "number") {
      state.promptTokens = usageRecord.prompt_tokens;
    }
    if (typeof usageRecord.completion_tokens === "number") {
      state.completionTokens = usageRecord.completion_tokens;
    }
  }
};

const ingestStreamEvent = (state: OpenAIStreamState, raw: unknown) => {
  if (!raw || typeof raw !== "object") {
    return;
  }

  const event = raw as Record<string, unknown>;

  const eventType = typeof event.type === "string" ? event.type : undefined;
  if (eventType === "response.output_text.delta") {
    pushDeltaText(state, event.delta);
  }

  const choices = event.choices;
  if (Array.isArray(choices) && choices.length > 0) {
    const choice = choices[0];
    if (choice && typeof choice === "object") {
      const choiceRecord = choice as Record<string, unknown>;

      const finishFromChoice = mapRawFinishReason(
        typeof choiceRecord.finish_reason === "string"
          ? choiceRecord.finish_reason
          : undefined,
      );
      if (finishFromChoice) {
        state.finishReason = finishFromChoice;
      }

      const delta = choiceRecord.delta;
      if (delta && typeof delta === "object") {
        const deltaRecord = delta as Record<string, unknown>;
        pushDeltaText(state, deltaRecord.content);
      }

      const message = choiceRecord.message;
      if (message && typeof message === "object") {
        const messageRecord = message as Record<string, unknown>;
        pushFallbackText(state, messageRecord.content);
      }
    }
  }

  const responsePayload = event.response;
  if (responsePayload && typeof responsePayload === "object") {
    const responseRecord = responsePayload as Record<string, unknown>;
    updateUsageAndModel(state, responseRecord);

    if (eventType === "response.completed") {
      state.completedPayload = responseRecord as OpenAIResponsesResponse;
      state.finishReason = resolveFinishReason(state.completedPayload);
    }

    const incompleteDetails = responseRecord.incomplete_details;
    if (incompleteDetails && typeof incompleteDetails === "object") {
      const reason = (incompleteDetails as Record<string, unknown>).reason;
      const mapped = mapRawFinishReason(
        typeof reason === "string" ? reason : undefined,
      );
      if (mapped) {
        state.finishReason = mapped;
      }
    }

    pushFallbackText(state, responseRecord.output_text);
  }

  updateUsageAndModel(state, event);
  pushFallbackText(state, event.output_text);
  if (eventType !== "response.output_text.delta") {
    pushDeltaText(state, event.delta);
  }
};

const parseStreamResponse = async (
  response: Response,
): Promise<{
  text: string;
  finishReason: NonNullable<RuntimeModelResponse["finishReason"]>;
  model?: string;
  promptTokens?: number;
  completionTokens?: number;
}> => {
  if (!response.body) {
    throw new Error("OpenAI Responses stream error: missing response body.");
  }

  const state: OpenAIStreamState = {
    hasDeltaText: false,
    deltaChunks: [],
    fallbackText: "",
  };

  const decoder = new TextDecoder();
  const reader = response.body.getReader();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      buffer += decoder.decode();
      break;
    }

    buffer += decoder.decode(value, { stream: true });

    // SSE frame separator is a blank line.
    while (true) {
      const frameEnd = buffer.indexOf("\n\n");
      if (frameEnd < 0) {
        break;
      }

      const frame = buffer.slice(0, frameEnd);
      buffer = buffer.slice(frameEnd + 2);

      const lines = frame.split("\n");
      for (const line of lines) {
        if (!line.startsWith("data:")) {
          continue;
        }

        const data = line.slice(5).trim();
        if (!data || data === "[DONE]") {
          continue;
        }

        try {
          const parsed = JSON.parse(data) as unknown;
          ingestStreamEvent(state, parsed);
        } catch {
          // Ignore malformed chunks and continue reading.
        }
      }
    }
  }

  // Parse any trailing frame without blank-line terminator.
  if (buffer.length > 0) {
    for (const line of buffer.split("\n")) {
      if (!line.startsWith("data:")) {
        continue;
      }

      const data = line.slice(5).trim();
      if (!data || data === "[DONE]") {
        continue;
      }

      try {
        const parsed = JSON.parse(data) as unknown;
        ingestStreamEvent(state, parsed);
      } catch {
        // Ignore malformed trailing chunk.
      }
    }
  }

  const streamedText = state.hasDeltaText
    ? state.deltaChunks.join("")
    : state.fallbackText;

  const text =
    streamedText.length > 0
      ? streamedText
      : state.completedPayload
        ? extractOutputText(state.completedPayload)
        : "";

  const finishReason = state.finishReason ?? (text.length > 0 ? "stop" : "error");

  const result: {
    text: string;
    finishReason: NonNullable<RuntimeModelResponse["finishReason"]>;
    model?: string;
    promptTokens?: number;
    completionTokens?: number;
  } = {
    text,
    finishReason,
  };

  const model = state.completedPayload?.model ?? state.model;
  if (typeof model === "string" && model.length > 0) {
    result.model = model;
  }

  const promptTokens =
    state.completedPayload?.usage?.input_tokens ?? state.promptTokens;
  if (typeof promptTokens === "number") {
    result.promptTokens = promptTokens;
  }

  const completionTokens =
    state.completedPayload?.usage?.output_tokens ?? state.completionTokens;
  if (typeof completionTokens === "number") {
    result.completionTokens = completionTokens;
  }

  return result;
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
            input: [
              {
                role: "user",
                content: [
                  {
                    type: "input_text",
                    text: request.prompt,
                  },
                ],
              },
            ],
            max_output_tokens: request.maxOutputTokens,
            stream: this.#options.enableStreaming === true,
            ...(this.#options.enforceJsonResponse === false
              ? {}
              : {
                  text: {
                    format: {
                      type: "json_schema",
                      name: RUNTIME_OUTPUT_SCHEMA_NAME,
                      schema: RuntimeStructuredOutputJsonSchema,
                      strict: true,
                    },
                  },
                }),
          }),
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI Responses API error: ${response.status} - ${error}`);
      }

      if (this.#options.enableStreaming === true) {
        const streamed = await parseStreamResponse(response);
        return {
          text: streamed.text,
          finishReason: streamed.finishReason,
          model: streamed.model,
          latencyMs: Date.now() - startedAt,
          promptTokens: streamed.promptTokens,
          completionTokens: streamed.completionTokens,
        };
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
  const enableStreaming = parseBoolean(env.OPENAI_RESPONSES_STREAM);

  const options: OpenAIResponsesModelClientOptions = {
    apiKey,
    baseUrl: env.OPENAI_BASE_URL ?? DEFAULT_OPENAI_BASE_URL,
    model: env.OPENAI_MODEL_CHAT ?? DEFAULT_OPENAI_MODEL,
    enforceJsonResponse: true,
  };
  if (timeoutMs !== undefined) {
    options.timeoutMs = timeoutMs;
  }
  if (enableStreaming !== undefined) {
    options.enableStreaming = enableStreaming;
  }

  return new OpenAIResponsesModelClient(options);
};
