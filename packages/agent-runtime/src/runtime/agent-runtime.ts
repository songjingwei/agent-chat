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

export interface RuntimeFailureDiagnostic {
  attempt: number;
  failureCode: RuntimeFailureCode;
  failureMessage: string;
  finishReason?: RuntimeModelResponse["finishReason"] | undefined;
  model?: string | undefined;
  rawModelOutput?: string | undefined;
}

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
  failureDiagnostics?: RuntimeFailureDiagnostic[] | undefined;
  transitions: StateTransition[];
}

export interface AgentRuntimeEngineOptions {
  modelClient: RuntimeModelClient;
  promptManager?: PromptManager;
  maxAttempts?: number;
  maxOutputTokens?: number;
  fallbackReply?: string | ((input: RuntimeTurnInput) => string);
}

const DEFAULT_MAX_ATTEMPTS = 2;
const DEFAULT_MAX_OUTPUT_TOKENS = 450;
const containsCjk = (text: string): boolean => /[\u3400-\u9fff]/u.test(text);

const detectFallbackLanguage = (input: RuntimeTurnInput): "zh" | "en" => {
  const sample = [
    input.speakerPersona.name,
    input.speakerPersona.bio ?? "",
    input.speakerPersona.traits.join(" "),
    input.counterpartPersona.name,
    input.counterpartPersona.bio ?? "",
    input.counterpartPersona.traits.join(" "),
    ...input.recentMessages.slice(-3).map((message) => message.content),
  ].join(" ");

  return containsCjk(sample) ? "zh" : "en";
};

const buildFriendlyFallbackReply = (input: RuntimeTurnInput): string => {
  const counterpartName = input.counterpartPersona.name;
  const hasHistory = input.recentMessages.length > 0;
  const language = detectFallbackLanguage(input);

  if (language === "zh") {
    if (!hasHistory) {
      return `${counterpartName}，我想先从轻一点的话题开始。最近有没有一件让你觉得放松的小事？`;
    }

    return `${counterpartName}，你刚才那句话我记住了。换个轻一点的角度说，我还挺想继续听你讲下去。`;
  }

  if (!hasHistory) {
    return `Hi ${counterpartName}. I want to start with something light. What's one small thing that's made you feel good recently?`;
  }

  return `I've been thinking about what you just said. From a gentler angle, I'd still love to hear a little more from you.`;
};

export class AgentRuntimeEngine {
  readonly #modelClient: RuntimeModelClient;
  readonly #promptManager: PromptManager;
  readonly #defaultMaxAttempts: number;
  readonly #defaultMaxOutputTokens: number;
  readonly #fallbackReply: string | ((input: RuntimeTurnInput) => string);

  constructor(options: AgentRuntimeEngineOptions) {
    this.#modelClient = options.modelClient;
    this.#promptManager = options.promptManager ?? new PromptManager();
    this.#defaultMaxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
    this.#defaultMaxOutputTokens =
      options.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS;
    this.#fallbackReply = options.fallbackReply ?? buildFriendlyFallbackReply;
  }

  async runTurn(input: RuntimeTurnInput): Promise<RuntimeTurnResult> {
    const stateMachine = new AgentStateMachine();
    stateMachine.transition("START_TURN");

    const promptBuildResult = this.#promptManager.buildTurnPrompt(input);
    const maxAttempts = Math.max(1, input.maxAttempts ?? this.#defaultMaxAttempts);
    const maxOutputTokens = input.maxOutputTokens ?? this.#defaultMaxOutputTokens;

    let lastFailureCode: RuntimeFailureCode = "json_parse_error";
    let latestModelMeta: RuntimeTurnResult["modelMeta"] | undefined;
    const failureDiagnostics: RuntimeFailureDiagnostic[] = [];

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
          failureDiagnostics.push({
            attempt,
            failureCode: lastFailureCode,
            failureMessage: "Model output hit the token limit before completion.",
            finishReason: modelResponse.finishReason,
            model: modelResponse.model,
            rawModelOutput:
              modelResponse.text.trim().length > 0 ? modelResponse.text : undefined,
          });
          continue;
        }

        const parsed = parseRuntimeStructuredOutput(modelResponse.text);
        if (!parsed.success) {
          lastFailureCode = parsed.error.code;
          failureDiagnostics.push({
            attempt,
            failureCode: parsed.error.code,
            failureMessage: parsed.error.message,
            finishReason: modelResponse.finishReason,
            model: modelResponse.model,
            rawModelOutput:
              modelResponse.text.trim().length > 0 ? modelResponse.text : undefined,
          });
          continue;
        }

        const message = parsed.data.response.content.trim();

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
            intent: parsed.data.response.shouldEndSession
              ? "close_session"
              : "clarify",
            tone: "calm",
            shouldEndSession: parsed.data.response.shouldEndSession,
          },
          memoryWrites: [],
          promptMeta: promptBuildResult.meta,
          transitions: stateMachine.getHistory(),
        };
        if (latestModelMeta) {
          result.modelMeta = latestModelMeta;
        }
        if (failureDiagnostics.length > 0) {
          result.failureDiagnostics = [...failureDiagnostics];
        }
        return result;
      } catch (error) {
        lastFailureCode = "model_error";
        failureDiagnostics.push({
          attempt,
          failureCode: lastFailureCode,
          failureMessage: error instanceof Error ? error.message : String(error),
          finishReason: "error",
        });
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
        content:
          typeof this.#fallbackReply === "function"
            ? this.#fallbackReply(input)
            : this.#fallbackReply,
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
    if (failureDiagnostics.length > 0) {
      fallbackResult.failureDiagnostics = failureDiagnostics;
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
