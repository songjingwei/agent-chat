import assert from "node:assert/strict";
import test from "node:test";

import type { RuntimeTurnResult } from "@agent/runtime";
import type { AdvanceConversationJobData } from "@agent/shared";

import {
  advanceConversation,
  type AdvanceDeps,
} from "./conversation-advancer.service.js";
import type { ChatMessage, Persona, Session, SessionStatus } from "./types.js";

const createSession = (): Session => ({
  id: "ses_test",
  initiatorPersonaId: "prs_initiator",
  targetPersonaId: "prs_target",
  status: "active",
  currentRound: 0,
  maxRounds: 10,
  createdAt: "2026-03-27T00:00:00.000Z",
  updatedAt: "2026-03-27T00:00:00.000Z",
});

const createPersona = (id: string, displayName: string): Persona => ({
  id,
  userId: `usr_${id}`,
  displayName,
  traits: ["calm"],
  createdAt: "2026-03-27T00:00:00.000Z",
  updatedAt: "2026-03-27T00:00:00.000Z",
});

test("advanceConversation stores runtime failure diagnostics on fallback messages", async () => {
  const session = createSession();
  const initiator = createPersona(session.initiatorPersonaId, "Jeev");
  const target = createPersona(session.targetPersonaId, "易涵");
  const createdAgentMessages: Array<{
    content: string;
    metadata?: Record<string, unknown>;
    authorPersonaId: string;
  }> = [];
  const updatedStatuses: SessionStatus[] = [];

  const fallbackResult: RuntimeTurnResult = {
    sessionId: session.id,
    status: "fallback",
    attempts: 2,
    usedFallback: true,
    failureCode: "schema_validation_error",
    failureDiagnostics: [
      {
        attempt: 1,
        failureCode: "schema_validation_error",
        failureMessage:
          "response.memoryCandidates: memoryCandidates must be empty when extractMemories is false.",
        finishReason: "stop",
        model: "mock-runtime",
        rawModelOutput: "{\"response\":{\"extractMemories\":false,\"memoryCandidates\":[{}]}}",
      },
      {
        attempt: 2,
        failureCode: "schema_validation_error",
        failureMessage:
          "response.memoryCandidates: memoryCandidates must be empty when extractMemories is false.",
        finishReason: "stop",
        model: "mock-runtime",
        rawModelOutput: "{\"response\":{\"extractMemories\":false,\"memoryCandidates\":[{}]}}",
      },
    ],
    message: {
      role: "agent",
      content: "fallback message",
      intent: "clarify",
      tone: "calm",
      shouldEndSession: false,
    },
    memoryWrites: [],
    promptMeta: {
      tokenEstimate: 100,
      includedMessages: 0,
      includedMemories: 1,
    },
    modelMeta: {
      model: "mock-runtime",
      latencyMs: 12,
      promptTokens: 34,
      completionTokens: 56,
    },
    transitions: [],
  };

  const deps: AdvanceDeps = {
    sessionService: {
      async getById() {
        return session;
      },
      async updateStatus(_sessionId: string, status: SessionStatus) {
        updatedStatuses.push(status);
        return { ...session, status };
      },
      async incrementRound() {
        return { ...session, currentRound: 1 };
      },
    } as AdvanceDeps["sessionService"],
    messageService: {
      async listBySession() {
        return [] as ChatMessage[];
      },
      async createAgentMessage(input) {
        createdAgentMessages.push({
          content: input.content,
          metadata: input.metadata,
          authorPersonaId: input.authorPersonaId,
        });

        return {
          id: "msg_test",
          sessionId: input.sessionId,
          authorPersonaId: input.authorPersonaId,
          role: "agent",
          content: input.content,
          metadata: input.metadata,
          createdAt: "2026-03-27T00:00:00.000Z",
        };
      },
      async createSystemMessage() {
        throw new Error("createSystemMessage should not be called for fallback");
      },
    } as AdvanceDeps["messageService"],
    personaService: {
      async getById(personaId: string) {
        if (personaId === initiator.id) {
          return initiator;
        }
        if (personaId === target.id) {
          return target;
        }
        return undefined;
      },
    } as AdvanceDeps["personaService"],
    runtimeService: {
      async generateTurn() {
        return fallbackResult;
      },
    } as AdvanceDeps["runtimeService"],
  };

  const job: AdvanceConversationJobData = {
    sessionId: session.id,
    trigger: "system_resume",
  };

  const result = await advanceConversation(job, deps);

  assert.equal(result.action, "completed");
  assert.equal(result.reason, "fallback_paused");
  assert.equal(createdAgentMessages.length, 1);
  assert.equal(createdAgentMessages[0]?.content, "fallback message");
  assert.equal(
    createdAgentMessages[0]?.authorPersonaId,
    session.initiatorPersonaId,
  );

  const runtimeMeta = (
    createdAgentMessages[0]?.metadata as
      | { runtime?: Record<string, unknown> }
      | undefined
  )?.runtime;
  assert.ok(runtimeMeta);
  assert.equal(runtimeMeta?.status, "fallback");
  assert.equal(runtimeMeta?.failureCode, "schema_validation_error");
  assert.deepEqual(
    runtimeMeta?.failureDiagnostics,
    fallbackResult.failureDiagnostics,
  );
  assert.deepEqual(updatedStatuses, ["paused"]);
});
