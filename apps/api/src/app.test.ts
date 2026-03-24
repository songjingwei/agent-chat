import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { createApp } from "./app.js";
import { HealthService } from "./services/health.service.js";
import { createServices } from "./services/index.js";
import type { RuntimeService } from "./services/runtime.service.js";

interface CreateTestAppOptions {
  runtimeService?: RuntimeService;
}

const createTestApp = (options: CreateTestAppOptions = {}) => {
  const healthService = new HealthService({
    postgresProbe: async () => ({
      status: "ok",
      target: "test-postgres:5432",
      latencyMs: 1,
    }),
    redisProbe: async () => ({
      status: "ok",
      target: "test-redis:6379",
      latencyMs: 1,
    }),
  });

  return createApp(
    createServices({
      healthService,
      runtimeService: options.runtimeService,
    }),
  );
};

const authHeaders = (accessToken: string) => ({
  "content-type": "application/json",
  authorization: `Bearer ${accessToken}`,
});

const registerTestUser = async (
  app: ReturnType<typeof createTestApp>,
  label: string,
) => {
  const email = `${label}-${randomUUID()}@test.local`;
  const password = "Passw0rd!123456";
  const displayName = `${label}-display`;

  const response = await app.request("/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email,
      password,
      displayName,
    }),
  });
  assert.equal(response.status, 201);

  const payload = await response.json();
  return {
    userId: payload.data.user.id as string,
    accessToken: payload.data.tokens.accessToken as string,
    refreshToken: payload.data.tokens.refreshToken as string,
  };
};

test("GET /health should return ok", async () => {
  const app = createTestApp();
  const response = await app.request("/health");

  assert.equal(response.status, 200);

  const body = await response.json();
  assert.equal(body.success, true);
  assert.equal(body.data.status, "ok");
  assert.equal(body.data.service, "agent-api");
  assert.equal(body.data.checks.postgres.status, "ok");
  assert.equal(body.data.checks.redis.status, "ok");
});

test("persona/session/message/report flow should work", async () => {
  const app = createTestApp();
  const userA = await registerTestUser(app, "user-a");
  const userB = await registerTestUser(app, "user-b");

  const personaAResponse = await app.request("/personas", {
    method: "POST",
    headers: authHeaders(userA.accessToken),
    body: JSON.stringify({
      displayName: "Alice",
      traits: ["curious", "kind"],
    }),
  });

  const personaBResponse = await app.request("/personas", {
    method: "POST",
    headers: authHeaders(userB.accessToken),
    body: JSON.stringify({
      displayName: "Bob",
      traits: ["calm"],
    }),
  });

  assert.equal(personaAResponse.status, 201);
  assert.equal(personaBResponse.status, 201);

  const personaAJson = await personaAResponse.json();
  const personaBJson = await personaBResponse.json();

  const sessionResponse = await app.request("/sessions", {
    method: "POST",
    headers: authHeaders(userA.accessToken),
    body: JSON.stringify({
      initiatorPersonaId: personaAJson.data.id,
      targetPersonaId: personaBJson.data.id,
    }),
  });

  assert.equal(sessionResponse.status, 201);

  const sessionJson = await sessionResponse.json();

  const messageResponse = await app.request(
    `/sessions/${sessionJson.data.id}/human-message`,
    {
      method: "POST",
      headers: authHeaders(userA.accessToken),
      body: JSON.stringify({
        authorPersonaId: personaAJson.data.id,
        content: "你好，很高兴认识你。",
      }),
    },
  );

  assert.equal(messageResponse.status, 201);

  const reportResponse = await app.request(
    `/reports/latest?personaId=${personaAJson.data.id}`,
    { headers: { authorization: `Bearer ${userA.accessToken}` } },
  );

  assert.equal(reportResponse.status, 200);

  const reportJson = await reportResponse.json();
  assert.equal(reportJson.success, true);
  assert.equal(reportJson.data.personaId, personaAJson.data.id);
  assert.equal(reportJson.data.totalMessages, 1);
});

test("POST /sessions/:id/human-message should append one runtime agent reply when runtime is available", async () => {
  const runtimeService = {
    generateTurn: async () => {
      return {
        sessionId: "ses_runtime",
        status: "ok",
        attempts: 1,
        usedFallback: false,
        message: {
          role: "agent" as const,
          content: "你好，我也很高兴认识你。",
          intent: "empathize" as const,
          tone: "warm" as const,
          shouldEndSession: false,
        },
        memoryWrites: [],
        promptMeta: {
          tokenEstimate: 100,
          includedMessages: 1,
          includedMemories: 0,
        },
        modelMeta: {
          model: "mock-runtime",
          latencyMs: 10,
          promptTokens: 20,
          completionTokens: 10,
        },
        transitions: [],
      };
    },
  } as RuntimeService;

  const app = createTestApp({ runtimeService });
  const userA = await registerTestUser(app, "runtime-a");
  const userB = await registerTestUser(app, "runtime-b");

  const personaAResponse = await app.request("/personas", {
    method: "POST",
    headers: authHeaders(userA.accessToken),
    body: JSON.stringify({
      displayName: "Alice",
      traits: ["curious"],
    }),
  });
  const personaBResponse = await app.request("/personas", {
    method: "POST",
    headers: authHeaders(userB.accessToken),
    body: JSON.stringify({
      displayName: "Bob",
      traits: ["calm"],
    }),
  });
  assert.equal(personaAResponse.status, 201);
  assert.equal(personaBResponse.status, 201);

  const personaAJson = await personaAResponse.json();
  const personaBJson = await personaBResponse.json();

  const sessionResponse = await app.request("/sessions", {
    method: "POST",
    headers: authHeaders(userA.accessToken),
    body: JSON.stringify({
      initiatorPersonaId: personaAJson.data.id,
      targetPersonaId: personaBJson.data.id,
    }),
  });
  assert.equal(sessionResponse.status, 201);
  const sessionJson = await sessionResponse.json();

  const messageResponse = await app.request(
    `/sessions/${sessionJson.data.id}/human-message`,
    {
      method: "POST",
      headers: authHeaders(userA.accessToken),
      body: JSON.stringify({
        authorPersonaId: personaAJson.data.id,
        content: "你好，很高兴认识你。",
      }),
    },
  );
  assert.equal(messageResponse.status, 201);

  const listResponse = await app.request(
    `/sessions/${sessionJson.data.id}/messages`,
    { headers: { authorization: `Bearer ${userA.accessToken}` } },
  );
  assert.equal(listResponse.status, 200);
  const listJson = await listResponse.json();
  assert.equal(listJson.success, true);
  assert.equal(listJson.data.total, 2);
  assert.equal(listJson.data.items[0].role, "human");
  assert.equal(listJson.data.items[1].role, "agent");
  assert.equal(listJson.data.items[1].authorPersonaId, personaBJson.data.id);
  assert.equal(listJson.data.items[1].content, "你好，我也很高兴认识你。");
});

test("GET /sessions should support userId filtering for web session list", async () => {
  const app = createTestApp();
  const userA = await registerTestUser(app, "sessions-a");
  const userB = await registerTestUser(app, "sessions-b");
  const userC = await registerTestUser(app, "sessions-c");

  const createPersona = async (accessToken: string, displayName: string) => {
    const response = await app.request("/personas", {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify({
        displayName,
        traits: [],
      }),
    });

    assert.equal(response.status, 201);
    return response.json();
  };

  const personaAJson = await createPersona(userA.accessToken, "Alice");
  const personaBJson = await createPersona(userB.accessToken, "Bob");
  const personaCJson = await createPersona(userC.accessToken, "Carol");

  const createSession = async (
    accessToken: string,
    initiatorPersonaId: string,
    targetPersonaId: string,
  ) => {
    const response = await app.request("/sessions", {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify({
        initiatorPersonaId,
        targetPersonaId,
      }),
    });

    assert.equal(response.status, 201);
    return response.json();
  };

  await createSession(
    userA.accessToken,
    personaAJson.data.id,
    personaBJson.data.id,
  );
  await createSession(
    userB.accessToken,
    personaBJson.data.id,
    personaCJson.data.id,
  );

  // user-a should only see sessions involving their personas
  const response = await app.request("/sessions", {
    headers: { authorization: `Bearer ${userA.accessToken}` },
  });
  assert.equal(response.status, 200);

  const body = await response.json();
  assert.equal(body.success, true);
  assert.equal(body.data.total, 1);
  assert.equal(body.data.items[0].initiatorPersonaId, personaAJson.data.id);
});

test("web contract should return stable 404 errors for missing messages/report resources", async () => {
  const app = createTestApp();
  const user = await registerTestUser(app, "missing-resource-user");

  const missingMessagesResponse = await app.request("/sessions/ses_missing/messages", {
    headers: { authorization: `Bearer ${user.accessToken}` },
  });
  assert.equal(missingMessagesResponse.status, 404);

  const missingMessagesJson = await missingMessagesResponse.json();
  assert.equal(missingMessagesJson.success, false);
  assert.equal(missingMessagesJson.error.code, "SESSION_NOT_FOUND");

  const missingReportResponse = await app.request(
    "/reports/latest?personaId=prs_missing",
    { headers: { authorization: `Bearer ${user.accessToken}` } },
  );
  assert.equal(missingReportResponse.status, 404);

  const missingReportJson = await missingReportResponse.json();
  assert.equal(missingReportJson.success, false);
  assert.equal(missingReportJson.error.code, "PERSONA_NOT_FOUND");
});

test("GET /personas should support plaza pagination and exclude current user", async () => {
  const app = createTestApp();
  const userA = await registerTestUser(app, "plaza-a");
  const userB = await registerTestUser(app, "plaza-b");
  const userC = await registerTestUser(app, "plaza-c");

  const createPersona = async (accessToken: string, displayName: string) => {
    const response = await app.request("/personas", {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify({
        displayName,
        traits: [],
      }),
    });
    assert.equal(response.status, 201);
    return response.json();
  };

  await createPersona(userA.accessToken, "A");
  await createPersona(userB.accessToken, "B");
  await createPersona(userC.accessToken, "C");
  const seed = "plaza-test-seed";

  const firstPageResponse = await app.request(
    `/personas?excludeUserId=${userA.userId}&limit=1&seed=${seed}`,
  );
  assert.equal(firstPageResponse.status, 200);

  const firstPageBody = await firstPageResponse.json();
  assert.equal(firstPageBody.success, true);
  assert.equal(firstPageBody.data.items.length, 1);
  assert.ok(firstPageBody.data.total >= 2);
  assert.ok(firstPageBody.data.nextCursor);
  assert.notEqual(firstPageBody.data.items[0].userId, userA.userId);

  const secondPageResponse = await app.request(
    `/personas?excludeUserId=${userA.userId}&limit=1&seed=${seed}&cursor=${encodeURIComponent(firstPageBody.data.nextCursor)}`,
  );
  assert.equal(secondPageResponse.status, 200);

  const secondPageBody = await secondPageResponse.json();
  assert.equal(secondPageBody.success, true);
  assert.equal(secondPageBody.data.items.length, 1);
  assert.ok(secondPageBody.data.total >= 2);
  assert.notEqual(secondPageBody.data.items[0].userId, userA.userId);
  assert.notEqual(
    secondPageBody.data.items[0].id,
    firstPageBody.data.items[0].id,
  );
});

test("unauthenticated requests to protected routes should return 401", async () => {
  const app = createTestApp();

  const response = await app.request("/sessions");
  assert.equal(response.status, 401);

  const body = await response.json();
  assert.equal(body.success, false);
  assert.equal(body.error.code, "AUTH_UNAUTHORIZED");
});
