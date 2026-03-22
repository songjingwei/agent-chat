import assert from "node:assert/strict";
import test from "node:test";

import { createApp } from "./app.js";
import { HealthService } from "./services/health.service.js";
import { createServices } from "./services/index.js";

const createTestApp = () => {
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

  return createApp(createServices({ healthService }));
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

  const personaAResponse = await app.request("/personas", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      userId: "user-a",
      displayName: "Alice",
      traits: ["curious", "kind"],
    }),
  });

  const personaBResponse = await app.request("/personas", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      userId: "user-b",
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
    headers: { "content-type": "application/json" },
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
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        authorPersonaId: personaAJson.data.id,
        content: "你好，很高兴认识你。",
      }),
    },
  );

  assert.equal(messageResponse.status, 201);

  const reportResponse = await app.request(
    `/reports/latest?personaId=${personaAJson.data.id}`,
  );

  assert.equal(reportResponse.status, 200);

  const reportJson = await reportResponse.json();
  assert.equal(reportJson.success, true);
  assert.equal(reportJson.data.personaId, personaAJson.data.id);
  assert.equal(reportJson.data.totalMessages, 1);
});

test("GET /sessions should support userId filtering for web session list", async () => {
  const app = createTestApp();

  const createPersona = async (userId: string, displayName: string) => {
    const response = await app.request("/personas", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        userId,
        displayName,
        traits: [],
      }),
    });

    assert.equal(response.status, 201);
    return response.json();
  };

  const personaAJson = await createPersona("user-a", "Alice");
  const personaBJson = await createPersona("user-b", "Bob");
  const personaCJson = await createPersona("user-c", "Carol");

  const createSession = async (initiatorPersonaId: string, targetPersonaId: string) => {
    const response = await app.request("/sessions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        initiatorPersonaId,
        targetPersonaId,
      }),
    });

    assert.equal(response.status, 201);
    return response.json();
  };

  await createSession(personaAJson.data.id, personaBJson.data.id);
  await createSession(personaBJson.data.id, personaCJson.data.id);

  const response = await app.request("/sessions?userId=user-a");
  assert.equal(response.status, 200);

  const body = await response.json();
  assert.equal(body.success, true);
  assert.equal(body.data.total, 1);
  assert.equal(body.data.items[0].initiatorPersonaId, personaAJson.data.id);
});

test("web contract should return stable 404 errors for missing messages/report resources", async () => {
  const app = createTestApp();

  const missingMessagesResponse = await app.request("/sessions/ses_missing/messages");
  assert.equal(missingMessagesResponse.status, 404);

  const missingMessagesJson = await missingMessagesResponse.json();
  assert.equal(missingMessagesJson.success, false);
  assert.equal(missingMessagesJson.error.code, "SESSION_NOT_FOUND");

  const missingReportResponse = await app.request(
    "/reports/latest?personaId=prs_missing",
  );
  assert.equal(missingReportResponse.status, 404);

  const missingReportJson = await missingReportResponse.json();
  assert.equal(missingReportJson.success, false);
  assert.equal(missingReportJson.error.code, "PERSONA_NOT_FOUND");
});
