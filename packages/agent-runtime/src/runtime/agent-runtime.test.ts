import assert from "node:assert/strict";
import test from "node:test";

import { AgentRuntimeEngine, type RuntimeModelClient } from "./agent-runtime.js";

test("runTurn returns structured message and memory writes on valid model JSON", async () => {
  const modelClient: RuntimeModelClient = {
    async generate() {
      return {
        text: JSON.stringify({
          response: {
            content: "What travel destination do you want to visit most recently?",
            shouldEndSession: false,
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
  assert.equal(result.message.intent, "clarify");
  assert.equal(result.message.tone, "calm");
  assert.equal(result.memoryWrites.length, 0);
  assert.deepEqual(
    result.transitions.map((transition) => transition.event),
    ["START_TURN", "MODEL_OUTPUT_PARSED", "MEMORY_PREPARED", "TURN_COMPLETED"],
  );
});

test("runTurn records schema validation diagnostics and returns fallback when response shape is invalid", async () => {
  const invalidResponse = JSON.stringify({
    response: {},
  });
  let attempt = 0;
  const modelClient: RuntimeModelClient = {
    async generate() {
      return {
        text: invalidResponse,
        finishReason: "stop",
        model: `mock-bad-schema-${++attempt}`,
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
  assert.equal(result.failureCode, "schema_validation_error");
  assert.equal(result.attempts, 2);
  assert.equal(result.message.content, "fallback message");
  assert.equal(result.memoryWrites.length, 0);
  assert.equal(result.failureDiagnostics?.length, 2);
  assert.deepEqual(
    result.failureDiagnostics?.map((item) => item.attempt),
    [1, 2],
  );
  assert.ok(
    result.failureDiagnostics?.every(
      (item) =>
        item.failureCode === "schema_validation_error"
        && item.rawModelOutput === invalidResponse
        && item.failureMessage.includes("response.content"),
    ),
  );
  assert.deepEqual(
    result.transitions.map((transition) => transition.event),
    ["START_TURN", "RETRY_GENERATION", "TURN_FAILED"],
  );
});

test("runTurn uses a natural default fallback reply instead of exposing parser errors", async () => {
  const modelClient: RuntimeModelClient = {
    async generate() {
      return {
        text: "{\"response\":{}}",
        finishReason: "stop",
        model: "mock-bad-schema",
      };
    },
  };

  const runtime = new AgentRuntimeEngine({
    modelClient,
    maxAttempts: 1,
  });

  const result = await runtime.runTurn({
    sessionId: "ses_test_3",
    speakerPersona: {
      id: "per_a",
      name: "jeevsong",
      traits: ["warm"],
    },
    counterpartPersona: {
      id: "per_b",
      name: "易涵",
      traits: ["gentle"],
    },
    recentMessages: [
      {
        role: "agent",
        authorName: "易涵",
        content: "其实我还挺想继续听你说下去。",
      },
    ],
    memoryItems: [],
  });

  assert.equal(result.status, "fallback");
  assert.equal(
    result.message.content,
    "易涵，你刚才那句话我记住了。换个轻一点的角度说，我还挺想继续听你讲下去。",
  );
  assert.equal(result.message.shouldEndSession, false);
});
