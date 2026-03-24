import assert from "node:assert/strict";
import test from "node:test";

import { AgentRuntimeEngine, type RuntimeModelClient } from "./agent-runtime.js";

test("runTurn returns structured message and memory writes on valid model JSON", async () => {
  const modelClient: RuntimeModelClient = {
    async generate() {
      return {
        text: JSON.stringify({
          thought: {
            intent: "ask_question",
            tone: "warm",
            rationale: "Keep the conversation moving with a concrete question.",
          },
          response: {
            content: "What travel destination do you want to visit most recently?",
            shouldEndSession: false,
            extractMemories: true,
            memoryCandidates: [
              {
                category: "preference",
                content: "The partner prefers a relaxed opener.",
                weight: 0.74,
                source: "agent_inferred",
              },
            ],
          },
        }),
        finishReason: "stop",
        model: "mock-success",
      };
    },
  };

  const runtime = new AgentRuntimeEngine({ modelClient });
  const result = await runtime.runTurn({
    sessionId: "ses_test_1",
    speakerPersona: {
      id: "per_alice",
      name: "Alice",
      bio: "Enjoys hiking and photography",
      traits: ["sincere", "outgoing"],
      systemPrompt: "Keep responses positive and sincere.",
    },
    counterpartPersona: {
      id: "per_bob",
      name: "Bob",
      bio: "Enjoys exhibitions and reading",
      traits: ["rational", "reserved"],
    },
    recentMessages: [
      {
        role: "agent",
        authorName: "Bob",
        content: "What do you usually do on weekends?",
      },
    ],
    memoryItems: [],
    sessionGoal: "Explore interests while keeping an easy pace",
  });

  assert.equal(result.status, "ok");
  assert.equal(result.usedFallback, false);
  assert.equal(result.attempts, 1);
  assert.equal(
    result.message.content,
    "What travel destination do you want to visit most recently?",
  );
  assert.equal(result.memoryWrites.length, 1);
  assert.deepEqual(
    result.transitions.map((transition) => transition.event),
    ["START_TURN", "MODEL_OUTPUT_PARSED", "MEMORY_PREPARED", "TURN_COMPLETED"],
  );
});

test("runTurn retries parse failures and returns fallback when all attempts fail", async () => {
  const modelClient: RuntimeModelClient = {
    async generate() {
      return {
        text: "This is not JSON and cannot be parsed.",
        finishReason: "stop",
        model: "mock-bad-json",
      };
    },
  };

  const runtime = new AgentRuntimeEngine({
    modelClient,
    maxAttempts: 2,
    fallbackReply: "fallback message",
  });

  const result = await runtime.runTurn({
    sessionId: "ses_test_2",
    speakerPersona: {
      id: "per_alice",
      name: "Alice",
      traits: ["sincere"],
    },
    counterpartPersona: {
      id: "per_bob",
      name: "Bob",
      traits: ["rational"],
    },
    recentMessages: [],
    memoryItems: [],
  });

  assert.equal(result.status, "fallback");
  assert.equal(result.usedFallback, true);
  assert.equal(result.failureCode, "json_parse_error");
  assert.equal(result.attempts, 2);
  assert.equal(result.message.content, "fallback message");
  assert.equal(result.memoryWrites.length, 0);
  assert.deepEqual(
    result.transitions.map((transition) => transition.event),
    ["START_TURN", "RETRY_GENERATION", "TURN_FAILED"],
  );
});
