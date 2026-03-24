import { PromptManager, type BuildPromptInput } from "../prompts/prompt-manager.js";
import {
  parseRuntimeStructuredOutput,
  type MemoryCategory,
  type MemorySource,
  type ThoughtIntent,
  type ThoughtTone,
} from "../schemas/structured-output.js";
import { AgentStateMachine, type StateTransition } from "../state-machine/agent-state-machine.js";

export interface RuntimeModelRequest {
  prompt: string;
  maxOutputTokens: number;
}

export interface RuntimeModelResponse {
  text: string;
  finishReason?: "stop" | "length" | "error";
  model?: string | undefined;
  latencyMs?: number | undefined;
  promptTokens?: number | undefined;
  completionTokens?: number | undefined;
}

export interface RuntimeModelClient {
  generate(request: RuntimeModelRequest): Promise<RuntimeModelResponse>;
}

export interface RuntimeTurnInput extends BuildPromptInput {
  sessionId: string;
  maxAttempts?: number | undefined;
  maxOutputTokens?: number | undefined;
}

export interface RuntimeTurnMessage {
  role: "agent";
  content: string;
  intent: ThoughtIntent;
  tone: ThoughtTone;
  shouldEndSession: boolean;
}

export interface RuntimeMemoryWrite {
  category: MemoryCategory;
  content: string;
  weight: number;
  source: MemorySource;
}

export type RuntimeFailureCode =
  | "json_parse_error"
  | "schema_validation_error"
  | "token_limit"
  | "model_error";

export interface RuntimeTurnResult {
  sessionId: string;
  status: "ok" | "fallback";
  attempts: number;
  usedFallback: boolean;
  message: RuntimeTurnMessage;
  memoryWrites: RuntimeMemoryWrite[];
  failureCode?: RuntimeFailureCode | undefined;
  promptMeta: {
    tokenEstimate: number;
    includedMessages: number;
    includedMemories: number;
  };
  modelMeta?: {
    model?: string | undefined;
    latencyMs?: number | undefined;
    promptTokens?: number | undefined;
    completionTokens?: number | undefined;
  };
  transitions: StateTransition[];
}

export interface AgentRuntimeEngineOptions {
  modelClient: RuntimeModelClient;
  promptManager?: PromptManager;
  maxAttempts?: number;
  maxOutputTokens?: number;
  fallbackReply?: string;
}

const DEFAULT_MAX_ATTEMPTS = 2;
const DEFAULT_MAX_OUTPUT_TOKENS = 450;
const DEFAULT_FALLBACK_REPLY =
  "Sorry, I could not safely parse the structured response. Let's continue from another angle.";

export class AgentRuntimeEngine {
  readonly #modelClient: RuntimeModelClient;
  readonly #promptManager: PromptManager;
  readonly #defaultMaxAttempts: number;
  readonly #defaultMaxOutputTokens: number;
  readonly #fallbackReply: string;

  constructor(options: AgentRuntimeEngineOptions) {
    this.#modelClient = options.modelClient;
    this.#promptManager = options.promptManager ?? new PromptManager();
    this.#defaultMaxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
    this.#defaultMaxOutputTokens =
      options.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS;
    this.#fallbackReply = options.fallbackReply ?? DEFAULT_FALLBACK_REPLY;
  }

  async runTurn(input: RuntimeTurnInput): Promise<RuntimeTurnResult> {
    const stateMachine = new AgentStateMachine();
    stateMachine.transition("START_TURN");

    const promptBuildResult = this.#promptManager.buildTurnPrompt(input);
    const maxAttempts = Math.max(1, input.maxAttempts ?? this.#defaultMaxAttempts);
    const maxOutputTokens = input.maxOutputTokens ?? this.#defaultMaxOutputTokens;

    let lastFailureCode: RuntimeFailureCode = "json_parse_error";
    let latestModelMeta: RuntimeTurnResult["modelMeta"] | undefined;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      if (attempt > 1) {
        stateMachine.transition("RETRY_GENERATION");
      }

      try {
        const modelResponse = await this.#modelClient.generate({
          prompt: promptBuildResult.prompt,
          maxOutputTokens,
        });
        latestModelMeta = {
          model: modelResponse.model,
          latencyMs: modelResponse.latencyMs,
          promptTokens: modelResponse.promptTokens,
          completionTokens: modelResponse.completionTokens,
        };

        if (modelResponse.finishReason === "length") {
          lastFailureCode = "token_limit";
          continue;
        }

        const parsed = parseRuntimeStructuredOutput(modelResponse.text);
        if (!parsed.success) {
          lastFailureCode = parsed.error.code;
          continue;
        }

        const message = parsed.data.response.content.trim();
        const memoryWrites = parsed.data.response.extractMemories
          ? parsed.data.response.memoryCandidates
          : [];

        stateMachine.transition("MODEL_OUTPUT_PARSED");
        stateMachine.transition("MEMORY_PREPARED");
        stateMachine.transition("TURN_COMPLETED");

        const result: RuntimeTurnResult = {
          sessionId: input.sessionId,
          status: "ok",
          attempts: attempt,
          usedFallback: false,
          message: {
            role: "agent",
            content: message,
            intent: parsed.data.thought.intent,
            tone: parsed.data.thought.tone,
            shouldEndSession: parsed.data.response.shouldEndSession,
          },
          memoryWrites,
          promptMeta: promptBuildResult.meta,
          transitions: stateMachine.getHistory(),
        };
        if (latestModelMeta) {
          result.modelMeta = latestModelMeta;
        }
        return result;
      } catch {
        lastFailureCode = "model_error";
      }
    }

    stateMachine.transition("TURN_FAILED");
    const fallbackResult: RuntimeTurnResult = {
      sessionId: input.sessionId,
      status: "fallback",
      attempts: maxAttempts,
      usedFallback: true,
      failureCode: lastFailureCode,
      message: {
        role: "agent",
        content: this.#fallbackReply,
        intent: "clarify",
        tone: "calm",
        shouldEndSession: false,
      },
      memoryWrites: [],
      promptMeta: promptBuildResult.meta,
      transitions: stateMachine.getHistory(),
    };
    if (latestModelMeta) {
      fallbackResult.modelMeta = latestModelMeta;
    }
    return fallbackResult;
  }
}

export const createStaticRuntimeModelClient = (
  text: string,
): RuntimeModelClient => {
  return {
    async generate() {
      return {
        text,
        finishReason: "stop",
        model: "static-runtime-model",
      };
    },
  };
};
