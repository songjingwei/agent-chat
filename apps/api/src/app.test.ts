import assert from "node:assert/strict";
import test from "node:test";

import { createApp } from "./app";

test("GET /health should return ok", async () => {
  const app = createApp();
  const response = await app.request("/health");

  assert.equal(response.status, 200);

  const body = await response.json();
  assert.equal(body.success, true);
  assert.equal(body.data.status, "ok");
  assert.equal(body.data.service, "agent-api");
});

test("persona/session/message/report flow should work", async () => {
  const app = createApp();

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
