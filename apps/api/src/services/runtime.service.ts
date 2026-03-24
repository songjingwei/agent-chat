import type { DbClient } from "@agent/db";
import {
  AgentRuntimeEngine,
  PromptManager,
  createRuntimeModelClient,
  type PromptMemoryItem,
  type PromptMessage,
  type PromptPersonaSnapshot,
  type RuntimeModelClient,
  type RuntimeModelClientFactoryEnv,
  type RuntimeTurnResult,
} from "@agent/runtime";

import {
  MemoryService,
} from "./memory.service.js";

export interface GenerateRuntimeTurnInput {
  sessionId: string;
  speakerPersona: PromptPersonaSnapshot;
  counterpartPersona: PromptPersonaSnapshot;
  recentMessages: PromptMessage[];
  memoryItems: PromptMemoryItem[];
  sessionGoal?: string | undefined;
}

export interface RuntimeServiceOptions {
  db?: DbClient;
  runtimeEngine?: AgentRuntimeEngine;
  modelClient?: RuntimeModelClient;
  memoryService?: MemoryService;
  env?: RuntimeModelClientFactoryEnv;
}

const mergeMemoryItems = (
  fromDb: PromptMemoryItem[],
  fromInput: PromptMemoryItem[],
): PromptMemoryItem[] => {
  const merged = new Map<string, PromptMemoryItem>();

  for (const item of [...fromDb, ...fromInput]) {
    const key = `${item.source}:${item.category}:${item.content.trim()}`;
    const existing = merged.get(key);
    if (!existing || item.weight > existing.weight) {
      merged.set(key, item);
    }
  }

  return [...merged.values()];
};

export class RuntimeService {
  readonly #modelClient: RuntimeModelClient | undefined;
  readonly #memoryService: MemoryService;
  readonly #runtimeEngineOverride: AgentRuntimeEngine | undefined;
  readonly #env: RuntimeModelClientFactoryEnv;

  #runtimeEngine: AgentRuntimeEngine | undefined;

  constructor(options: RuntimeServiceOptions = {}) {
    this.#modelClient = options.modelClient;
    this.#runtimeEngineOverride = options.runtimeEngine;
    this.#env = options.env ?? process.env;

    if (options.memoryService) {
      this.#memoryService = options.memoryService;
      return;
    }

    if (!options.db) {
      throw new Error("RuntimeService requires either memoryService or db.");
    }

    this.#memoryService = new MemoryService(options.db);
  }

  #getRuntimeEngine(): AgentRuntimeEngine {
    if (this.#runtimeEngineOverride) {
      return this.#runtimeEngineOverride;
    }

    if (this.#runtimeEngine) {
      return this.#runtimeEngine;
    }

    const modelClient = this.#modelClient ?? createRuntimeModelClient(this.#env);

    this.#runtimeEngine = new AgentRuntimeEngine({
      modelClient,
      promptManager: new PromptManager(),
    });

    return this.#runtimeEngine;
  }

  async generateTurn(input: GenerateRuntimeTurnInput): Promise<RuntimeTurnResult> {
    const dbMemories = await this.#memoryService.readForTurn({
      personaId: input.speakerPersona.id,
    });

    const result = await this.#getRuntimeEngine().runTurn({
      ...input,
      memoryItems: mergeMemoryItems(dbMemories, input.memoryItems),
    });

    if (result.status === "ok" && result.memoryWrites.length > 0) {
      try {
        await this.#memoryService.persistWrites({
          personaId: input.speakerPersona.id,
          sessionId: input.sessionId,
          writes: result.memoryWrites,
          createdBy: input.speakerPersona.id,
        });
      } catch (error) {
        console.error(
          "[runtime] memory_persist_failed",
          JSON.stringify({
            sessionId: input.sessionId,
            personaId: input.speakerPersona.id,
            error: error instanceof Error ? error.message : String(error),
          }),
        );
      }
    }

    return result;
  }
}
