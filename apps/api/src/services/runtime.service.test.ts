import assert from "node:assert/strict";
import test from "node:test";

import type {
  AgentRuntimeEngine,
  PromptMemoryItem,
  RuntimeTurnResult,
} from "@agent/runtime";

import { MemoryService, type PersistWritesInput } from "./memory.service.js";
import {
  RuntimeService,
  type GenerateRuntimeTurnInput,
} from "./runtime.service.js";

const createOkResult = (): RuntimeTurnResult => {
  return {
    sessionId: "ses_1",
    status: "ok",
    attempts: 1,
    usedFallback: false,
    message: {
      role: "agent",
      content: "hello",
      intent: "clarify",
      tone: "calm",
      shouldEndSession: false,
    },
    memoryWrites: [
      {
        category: "preference",
        content: "prefers concise replies",
        weight: 0.8,
        source: "agent_inferred",
      },
    ],
    promptMeta: {
      tokenEstimate: 1,
      includedMessages: 1,
      includedMemories: 1,
    },
    transitions: [],
  };
};

const createTurnInput = (): GenerateRuntimeTurnInput => {
  return {
    sessionId: "ses_1",
    speakerPersona: {
      id: "per_1",
      name: "Alice",
      traits: ["warm"],
    },
    counterpartPersona: {
      id: "per_2",
      name: "Bob",
      traits: ["calm"],
    },
    recentMessages: [
      {
        role: "agent",
        authorName: "Bob",
        content: "Hi",
      },
    ],
    memoryItems: [
      {
        category: "fact",
        content: "loves hiking",
        weight: 0.4,
        source: "agent_inferred",
      },
    ],
  };
};

test("RuntimeService merges memory inputs and persists runtime memory writes", async () => {
  const seenMemoryInputs: PromptMemoryItem[][] = [];
  let persistInput: PersistWritesInput | undefined;

  const runtimeEngine = {
    runTurn: async (input: { memoryItems: PromptMemoryItem[] }) => {
      seenMemoryInputs.push(input.memoryItems);
      return createOkResult();
    },
  } as unknown as AgentRuntimeEngine;

  const memoryService = {
    readForTurn: async () => {
      return [
        {
          category: "fact",
          content: "loves hiking",
          weight: 0.9,
          source: "agent_inferred",
        },
        {
          category: "experience",
          content: "went to Yunnan last year",
          weight: 0.7,
          source: "agent_inferred",
        },
      ] satisfies PromptMemoryItem[];
    },
    persistWrites: async (input: PersistWritesInput) => {
      persistInput = input;
      return { inserted: 1, skipped: 0 };
    },
  } as unknown as MemoryService;

  const service = new RuntimeService({
    runtimeEngine,
    memoryService,
  });

  const result = await service.generateTurn(createTurnInput());

  assert.equal(result.status, "ok");
  assert.equal(seenMemoryInputs.length, 1);
  assert.equal(seenMemoryInputs[0]?.length, 2);
  assert.deepEqual(
    seenMemoryInputs[0]?.map((item) => item.content).sort(),
    ["loves hiking", "went to Yunnan last year"],
  );

  assert.ok(persistInput);
  assert.equal(persistInput?.personaId, "per_1");
  assert.equal(persistInput?.sessionId, "ses_1");
  assert.equal(persistInput?.writes.length, 1);
});

test("RuntimeService should not fail turn when memory persistence throws", async () => {
  const runtimeEngine = {
    runTurn: async () => createOkResult(),
  } as unknown as AgentRuntimeEngine;

  const memoryService = {
    readForTurn: async () => [] as PromptMemoryItem[],
    persistWrites: async () => {
      throw new Error("db write failed");
    },
  } as unknown as MemoryService;

  const service = new RuntimeService({
    runtimeEngine,
    memoryService,
  });

  const originalConsoleError = console.error;
  console.error = () => undefined;

  try {
    const result = await service.generateTurn(createTurnInput());
    assert.equal(result.status, "ok");
    assert.equal(result.message.content, "hello");
  } finally {
    console.error = originalConsoleError;
  }
});
