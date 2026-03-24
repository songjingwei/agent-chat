import {
  AgentRuntimeEngine,
  PromptManager,
  createStaticRuntimeModelClient,
  type PromptMemoryItem,
  type PromptMessage,
  type PromptPersonaSnapshot,
  type RuntimeModelClient,
  type RuntimeTurnResult,
} from "@agent/runtime";

export interface GenerateRuntimeTurnInput {
  sessionId: string;
  speakerPersona: PromptPersonaSnapshot;
  counterpartPersona: PromptPersonaSnapshot;
  recentMessages: PromptMessage[];
  memoryItems: PromptMemoryItem[];
  sessionGoal?: string | undefined;
}

export interface RuntimeServiceOptions {
  runtimeEngine?: AgentRuntimeEngine;
  modelClient?: RuntimeModelClient;
}

const PLACEHOLDER_MODEL_OUTPUT = JSON.stringify({
  thought: {
    intent: "clarify",
    tone: "calm",
    rationale: "Runtime placeholder output before real model integration.",
  },
  response: {
    content: "I am ready to advance this conversation turn.",
    shouldEndSession: false,
    extractMemories: false,
    memoryCandidates: [],
  },
});

export class RuntimeService {
  private readonly runtimeEngine: AgentRuntimeEngine;

  constructor(options: RuntimeServiceOptions = {}) {
    const modelClient =
      options.modelClient ?? createStaticRuntimeModelClient(PLACEHOLDER_MODEL_OUTPUT);
    this.runtimeEngine =
      options.runtimeEngine ??
      new AgentRuntimeEngine({
        modelClient,
        promptManager: new PromptManager(),
      });
  }

  async generateTurn(input: GenerateRuntimeTurnInput): Promise<RuntimeTurnResult> {
    return this.runtimeEngine.runTurn(input);
  }
}
