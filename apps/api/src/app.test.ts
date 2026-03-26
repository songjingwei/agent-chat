import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import test, { after } from "node:test";

import { inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import jwt from "jsonwebtoken";
import pg from "pg";

import * as dbSchema from "../../../packages/db/src/schema/index.js";

import { createApp } from "./app.js";
import { apiConfig } from "./config.js";
import { AdminAuthService } from "./services/admin-auth.service.js";
import { AssessmentService } from "./services/assessment.service.js";
import { AuthService } from "./services/auth.service.js";
import { HealthService } from "./services/health.service.js";
import {
  InProcessConversationOrchestratorService,
  NoopConversationOrchestratorService,
  type ConversationOrchestrator,
} from "./services/conversation-orchestrator.service.js";
import { MessageService } from "./services/message.service.js";
import { PairInsightService } from "./services/pair-insight.service.js";
import { PersonaBuilderService } from "./services/persona-builder.service.js";
import { PersonaEditorService } from "./services/persona-editor.service.js";
import { PersonaService } from "./services/persona.service.js";
import { ReportService } from "./services/report.service.js";
import type { RuntimeService } from "./services/runtime.service.js";
import { RuntimeService as DefaultRuntimeService } from "./services/runtime.service.js";
import { SessionService } from "./services/session.service.js";

interface CreateTestAppOptions {
  runtimeService?: RuntimeService;
  conversationOrchestrator?: ConversationOrchestrator;
  useDefaultConversationOrchestrator?: boolean;
  sessionMaxRounds?: number;
}

const createTestDatabase = async () => {
  const baseUrl = new URL(apiConfig.databaseUrl);
  const adminUrl = new URL(baseUrl.toString());
  adminUrl.pathname = "/postgres";

  const dbName = `agent_api_test_${randomUUID().replace(/-/g, "")}`;
  const databaseUrl = new URL(baseUrl.toString());
  databaseUrl.pathname = `/${dbName}`;

  const adminClient = new pg.Client({ connectionString: adminUrl.toString() });
  await adminClient.connect();

  try {
    await adminClient.query(`CREATE DATABASE ${dbName}`);
  } finally {
    await adminClient.end();
  }

  const pool = new pg.Pool({ connectionString: databaseUrl.toString() });
  const migrationClient = await pool.connect();

  try {
    const migrationDir = new URL("../../../packages/db/drizzle/", import.meta.url);
    const migrationFiles = (await readdir(migrationDir))
      .filter((name) => /^\d+_.+\.sql$/.test(name))
      .sort((left, right) =>
        left.localeCompare(right, undefined, { numeric: true }),
      );

    for (const fileName of migrationFiles) {
      const migrationSql = await readFile(new URL(fileName, migrationDir), "utf8");

      for (const statement of migrationSql
        .split("--> statement-breakpoint")
        .map((chunk) => chunk.trim())
        .filter(Boolean)) {
        await migrationClient.query(statement);
      }
    }
  } finally {
    migrationClient.release();
  }

  return {
    dbName,
    adminConnectionString: adminUrl.toString(),
    pool,
    db: drizzle(pool, { schema: dbSchema }),
  };
};

const testDatabase = await createTestDatabase();

after(async () => {
  await testDatabase.pool.end();

  const adminClient = new pg.Client({
    connectionString: testDatabase.adminConnectionString,
  });
  await adminClient.connect();

  try {
    await adminClient.query(
      `SELECT pg_terminate_backend(pid)
       FROM pg_stat_activity
       WHERE datname = $1 AND pid <> pg_backend_pid()`,
      [testDatabase.dbName],
    );
    await adminClient.query(`DROP DATABASE IF EXISTS ${testDatabase.dbName}`);
  } finally {
    await adminClient.end();
  }
});

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

  const authService = new AuthService(testDatabase.db, {
    jwtSecret: apiConfig.jwtSecret,
    jwtAccessExpiresIn: apiConfig.jwtAccessExpiresIn,
    jwtRefreshExpiresIn: apiConfig.jwtRefreshExpiresIn,
  });
  const adminAuthService = new AdminAuthService(testDatabase.db, {
    jwtSecret: apiConfig.jwtSecret,
    jwtAccessExpiresIn: apiConfig.jwtAccessExpiresIn,
    jwtRefreshExpiresIn: apiConfig.jwtRefreshExpiresIn,
  });
  const assessmentService = new AssessmentService(testDatabase.db);
  const personaService = new PersonaService(testDatabase.db);
  const personaBuilderService = new PersonaBuilderService(testDatabase.db, {
    modelClient: {
      generate: async () => ({
        text: JSON.stringify({
          displayName: "Test Persona",
          bio: "Auto-generated in test",
          traits: ["calm"],
          systemPrompt: "You are calm and concise.",
        }),
        finishReason: "stop",
      }),
    } as never,
  });
  const personaEditorService = new PersonaEditorService(testDatabase.db);
  const pairInsightService = new PairInsightService(testDatabase.db);
  const sessionService = new SessionService(testDatabase.db, {
    defaultMaxRounds: options.sessionMaxRounds,
  });
  const messageService = new MessageService(
    testDatabase.db,
    sessionService,
    pairInsightService,
  );
  const reportService = new ReportService(testDatabase.db);
  const runtimeService =
    options.runtimeService ??
    new DefaultRuntimeService({
      db: testDatabase.db,
      env: {
        RUNTIME_MODEL_PROVIDER: apiConfig.runtimeModelProvider,
        RUNTIME_MODEL_TIMEOUT_MS: String(apiConfig.runtimeModelTimeoutMs),
        OPENAI_API_KEY: apiConfig.openAIApiKey,
        OPENAI_BASE_URL: apiConfig.openAIBaseUrl,
        OPENAI_MODEL_CHAT: apiConfig.openAIModelChat,
        OPENAI_RESPONSES_STREAM: apiConfig.openAIResponsesStream,
        ANTHROPIC_API_KEY: apiConfig.anthropicApiKey,
        ANTHROPIC_BASE_URL: apiConfig.anthropicBaseUrl,
        ANTHROPIC_MODEL_CHAT: apiConfig.anthropicModelChat,
        OLLAMA_BASE_URL: apiConfig.ollamaBaseUrl,
        OLLAMA_MODEL_CHAT: apiConfig.ollamaModelChat,
      },
    });
  const conversationOrchestrator = options.useDefaultConversationOrchestrator
    ? options.conversationOrchestrator ??
      new InProcessConversationOrchestratorService({
        messageService,
        sessionService,
        personaService,
        runtimeService,
      })
    : options.conversationOrchestrator ?? new NoopConversationOrchestratorService();

  return createApp({
    db: testDatabase.db,
    healthService,
    authService,
    adminAuthService,
    assessmentService,
    personaService,
    personaBuilderService,
    personaEditorService,
    pairInsightService,
    sessionService,
    messageService,
    reportService,
    runtimeService,
    conversationOrchestrator,
  });
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const waitFor = async (
  predicate: () => Promise<boolean>,
  timeoutMs = 2_500,
): Promise<void> => {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await predicate()) {
      return;
    }
    await sleep(25);
  }

  throw new Error(`waitFor timeout after ${timeoutMs}ms`);
};

const readSessionStatus = async (
  app: ReturnType<typeof createTestApp>,
  accessToken: string,
  sessionId: string,
): Promise<string> => {
  const response = await app.request(`/sessions/${sessionId}`, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  assert.equal(response.status, 200);
  const payload = await response.json();
  return payload.data.status as string;
};

const readSessionMessages = async (
  app: ReturnType<typeof createTestApp>,
  accessToken: string,
  sessionId: string,
) => {
  const response = await app.request(`/sessions/${sessionId}/messages`, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  assert.equal(response.status, 200);
  const payload = await response.json();
  return payload.data.items as Array<{
    id: string;
    role: "agent" | "human" | "system";
    authorPersonaId: string;
    content: string;
    metadata?: Record<string, unknown>;
  }>;
};

const registerPairAndCreateSession = async (
  app: ReturnType<typeof createTestApp>,
  label: string,
) => {
  const userA = await registerTestUser(app, `${label}-a`);
  const userB = await registerTestUser(app, `${label}-b`);

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
  return {
    userA,
    userB,
    initiatorPersonaId: personaAJson.data.id as string,
    targetPersonaId: personaBJson.data.id as string,
    sessionId: sessionJson.data.id as string,
  };
};

const authHeaders = (accessToken: string) => ({
  "content-type": "application/json",
  authorization: `Bearer ${accessToken}`,
});

const createAdminAccessToken = (adminId?: string) =>
  jwt.sign(
    {
      sub: adminId ?? `adm_${randomUUID().replace(/-/g, "")}`,
      role: "admin",
      type: "admin",
    },
    apiConfig.jwtSecret,
    { expiresIn: apiConfig.jwtAccessExpiresIn },
  );

const adminAuthHeaders = (accessToken: string) => ({
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
    email,
    password,
    displayName,
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

test("POST /auth/login should support email and display name identifiers", async () => {
  const app = createTestApp();
  const registered = await registerTestUser(app, "login-identifier");

  const emailLoginResponse = await app.request("/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      identifier: registered.email,
      password: registered.password,
    }),
  });
  assert.equal(emailLoginResponse.status, 200);

  const emailLoginJson = await emailLoginResponse.json();
  assert.equal(emailLoginJson.success, true);
  assert.equal(emailLoginJson.data.user.email, registered.email);

  const displayNameLoginResponse = await app.request("/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      identifier: registered.displayName,
      password: registered.password,
    }),
  });
  assert.equal(displayNameLoginResponse.status, 200);

  const displayNameLoginJson = await displayNameLoginResponse.json();
  assert.equal(displayNameLoginJson.success, true);
  assert.equal(displayNameLoginJson.data.user.email, registered.email);
});

test("POST /auth/login should reject ambiguous display names", async () => {
  const app = createTestApp();
  const sharedDisplayName = `shared-name-${randomUUID()}`;
  const password = "Passw0rd!123456";

  for (const email of [
    `ambiguous-a-${randomUUID()}@test.local`,
    `ambiguous-b-${randomUUID()}@test.local`,
  ]) {
    const response = await app.request("/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        displayName: sharedDisplayName,
      }),
    });
    assert.equal(response.status, 201);
  }

  const loginResponse = await app.request("/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      identifier: sharedDisplayName,
      password,
    }),
  });
  assert.equal(loginResponse.status, 409);

  const loginJson = await loginResponse.json();
  assert.equal(loginJson.success, false);
  assert.equal(loginJson.error.code, "AUTH_IDENTIFIER_AMBIGUOUS");
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

test("GET /sessions/:id/messages should support pair-scope cursor pagination", async () => {
  const app = createTestApp();
  const context = await registerPairAndCreateSession(app, "pair-history");

  const sendMessage = async (
    accessToken: string,
    authorPersonaId: string,
    content: string,
    sessionId: string,
  ) => {
    const response = await app.request(`/sessions/${sessionId}/human-message`, {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify({
        authorPersonaId,
        content,
      }),
    });
    assert.equal(response.status, 201);
  };

  for (let index = 0; index < 25; index += 1) {
    const fromInitiator = index % 2 === 0;
    await sendMessage(
      fromInitiator ? context.userA.accessToken : context.userB.accessToken,
      fromInitiator ? context.initiatorPersonaId : context.targetPersonaId,
      `S1-${String(index).padStart(2, "0")}`,
      context.sessionId,
    );
  }

  const forceEndResponse = await app.request(`/sessions/${context.sessionId}/force-end`, {
    method: "POST",
    headers: authHeaders(context.userA.accessToken),
  });
  assert.equal(forceEndResponse.status, 200);

  const secondSessionResponse = await app.request("/sessions", {
    method: "POST",
    headers: authHeaders(context.userA.accessToken),
    body: JSON.stringify({
      initiatorPersonaId: context.initiatorPersonaId,
      targetPersonaId: context.targetPersonaId,
    }),
  });
  assert.equal(secondSessionResponse.status, 201);
  const secondSessionJson = await secondSessionResponse.json();
  const secondSessionId = secondSessionJson.data.id as string;

  for (let index = 0; index < 15; index += 1) {
    const fromInitiator = index % 2 === 0;
    await sendMessage(
      fromInitiator ? context.userA.accessToken : context.userB.accessToken,
      fromInitiator ? context.initiatorPersonaId : context.targetPersonaId,
      `S2-${String(index).padStart(2, "0")}`,
      secondSessionId,
    );
  }

  const firstPageResponse = await app.request(
    `/sessions/${secondSessionId}/messages?scope=pair&limit=15`,
    {
      headers: { authorization: `Bearer ${context.userA.accessToken}` },
    },
  );
  assert.equal(firstPageResponse.status, 200);
  const firstPageJson = await firstPageResponse.json();
  assert.equal(firstPageJson.success, true);
  assert.equal(firstPageJson.data.total, 40);
  assert.equal(firstPageJson.data.items.length, 15);
  assert.ok(firstPageJson.data.nextCursor);
  assert.ok(
    firstPageJson.data.items.every((item: { content: string }) =>
      item.content.startsWith("S2-"),
    ),
  );

  const firstPageIds = new Set(
    firstPageJson.data.items.map((item: { id: string }) => item.id),
  );
  assert.equal(firstPageIds.size, 15);

  const secondPageResponse = await app.request(
    `/sessions/${secondSessionId}/messages?scope=pair&limit=15&cursor=${encodeURIComponent(
      firstPageJson.data.nextCursor as string,
    )}`,
    {
      headers: { authorization: `Bearer ${context.userA.accessToken}` },
    },
  );
  assert.equal(secondPageResponse.status, 200);
  const secondPageJson = await secondPageResponse.json();
  assert.equal(secondPageJson.success, true);
  assert.equal(secondPageJson.data.total, 40);
  assert.equal(secondPageJson.data.items.length, 15);
  assert.ok(secondPageJson.data.nextCursor);

  const secondPageIds = new Set(
    secondPageJson.data.items.map((item: { id: string }) => item.id),
  );
  assert.equal(secondPageIds.size, 15);
  for (const id of secondPageIds) {
    assert.equal(firstPageIds.has(id), false);
  }

  const thirdPageResponse = await app.request(
    `/sessions/${secondSessionId}/messages?scope=pair&limit=15&cursor=${encodeURIComponent(
      secondPageJson.data.nextCursor as string,
    )}`,
    {
      headers: { authorization: `Bearer ${context.userA.accessToken}` },
    },
  );
  assert.equal(thirdPageResponse.status, 200);
  const thirdPageJson = await thirdPageResponse.json();
  assert.equal(thirdPageJson.success, true);
  assert.equal(thirdPageJson.data.total, 40);
  assert.equal(thirdPageJson.data.items.length, 10);
  assert.equal(thirdPageJson.data.nextCursor, null);

  const allIds = new Set<string>();
  for (const item of firstPageJson.data.items as Array<{ id: string }>) {
    allIds.add(item.id);
  }
  for (const item of secondPageJson.data.items as Array<{ id: string }>) {
    allIds.add(item.id);
  }
  for (const item of thirdPageJson.data.items as Array<{ id: string }>) {
    allIds.add(item.id);
  }
  assert.equal(allIds.size, 40);
});

test("orchestrator should generate first message from initiator and complete on farewell handshake", async () => {
  const replies = [
    {
      content: "你好，我先来打个招呼。",
      shouldEndSession: false,
    },
    {
      content: "聊得很开心，我想我们可以说再见了。",
      shouldEndSession: true,
    },
    {
      content: "谢谢你，晚安，再见。",
      shouldEndSession: true,
    },
  ];

  const runtimeService = {
    generateTurn: async () => {
      const next = replies.shift() ?? {
        content: "fallback",
        shouldEndSession: true,
      };

      return {
        sessionId: "ses_runtime",
        status: "ok",
        attempts: 1,
        usedFallback: false,
        message: {
          role: "agent" as const,
          content: next.content,
          intent: "clarify" as const,
          tone: "calm" as const,
          shouldEndSession: next.shouldEndSession,
        },
        memoryWrites: [],
        promptMeta: {
          tokenEstimate: 100,
          includedMessages: 1,
          includedMemories: 1,
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

  const app = createTestApp({
    runtimeService,
    useDefaultConversationOrchestrator: true,
  });
  const context = await registerPairAndCreateSession(app, "orchestrator-first");

  await waitFor(async () => {
    const status = await readSessionStatus(
      app,
      context.userA.accessToken,
      context.sessionId,
    );
    return status === "completed";
  });

  const items = await readSessionMessages(
    app,
    context.userA.accessToken,
    context.sessionId,
  );
  const agentMessages = items.filter((item) => item.role === "agent");
  assert.ok(agentMessages.length >= 3);
  assert.equal(agentMessages[0]?.authorPersonaId, context.initiatorPersonaId);
  assert.equal(agentMessages[0]?.content, "你好，我先来打个招呼。");

  const systemMessages = items.filter((item) => item.role === "system");
  const kinds = systemMessages
    .map((item) => item.metadata?.orchestrator)
    .filter(Boolean)
    .map((meta) => (meta as Record<string, unknown>).kind);
  assert.ok(kinds.includes("farewell_proposed"));
  assert.ok(kinds.includes("farewell_completed"));
});

test("POST /sessions/:id/force-end should stop further orchestration advances", async () => {
  const runtimeService = {
    generateTurn: async () => {
      await sleep(30);
      return {
        sessionId: "ses_runtime",
        status: "ok",
        attempts: 1,
        usedFallback: false,
        message: {
          role: "agent" as const,
          content: "继续聊聊吧。",
          intent: "clarify" as const,
          tone: "calm" as const,
          shouldEndSession: false,
        },
        memoryWrites: [],
        promptMeta: {
          tokenEstimate: 100,
          includedMessages: 1,
          includedMemories: 1,
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

  const app = createTestApp({
    runtimeService,
    useDefaultConversationOrchestrator: true,
  });
  const context = await registerPairAndCreateSession(app, "orchestrator-force-end");

  const forceEndResponse = await app.request(
    `/sessions/${context.sessionId}/force-end`,
    {
      method: "POST",
      headers: authHeaders(context.userA.accessToken),
    },
  );
  assert.equal(forceEndResponse.status, 200);

  await waitFor(async () => {
    const status = await readSessionStatus(
      app,
      context.userA.accessToken,
      context.sessionId,
    );
    return status === "completed";
  });

  const before = await readSessionMessages(
    app,
    context.userA.accessToken,
    context.sessionId,
  );
  await sleep(150);
  const after = await readSessionMessages(
    app,
    context.userA.accessToken,
    context.sessionId,
  );
  assert.equal(after.length, before.length);
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

test("GET /discovery/personas should include relationship summaries for chatted personas", async () => {
  const app = createTestApp();
  const userA = await registerTestUser(app, "discovery-a");
  const userB = await registerTestUser(app, "discovery-b");

  const personaAResponse = await app.request("/personas", {
    method: "POST",
    headers: authHeaders(userA.accessToken),
    body: JSON.stringify({
      displayName: "Alice Discovery",
      traits: ["warm"],
    }),
  });
  const personaBResponse = await app.request("/personas", {
    method: "POST",
    headers: authHeaders(userB.accessToken),
    body: JSON.stringify({
      displayName: "Bob Discovery",
      traits: ["steady"],
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
        content: "今天我想分享一件小事：我下班路上闻到了桂花香。",
      }),
    },
  );
  assert.equal(messageResponse.status, 201);

  const discoveryResponse = await app.request(
    `/discovery/personas?viewerPersonaId=${personaAJson.data.id}&limit=12&seed=discovery-relationship`,
    {
      headers: { authorization: `Bearer ${userA.accessToken}` },
    },
  );
  assert.equal(discoveryResponse.status, 200);

  const discoveryJson = await discoveryResponse.json();
  assert.equal(discoveryJson.success, true);

  const counterpart = discoveryJson.data.items.find(
    (item: { id: string }) => item.id === personaBJson.data.id,
  );
  assert.ok(counterpart);
  assert.equal(counterpart.relationship.hasHistory, true);
  assert.equal(counterpart.relationship.sessionCount, 1);
  assert.equal(counterpart.relationship.messageCount, 1);
  assert.equal(counterpart.relationship.lastSessionId, sessionJson.data.id);
  assert.ok(counterpart.relationship.affinityLabel.length > 0);
  assert.ok(counterpart.relationship.summaryShort.length > 0);
});

test("GET /discovery/personas should split chatted and new personas by relationshipFilter", async () => {
  const app = createTestApp();
  const userA = await registerTestUser(app, "discovery-filter-a");
  const userB = await registerTestUser(app, "discovery-filter-b");
  const userC = await registerTestUser(app, "discovery-filter-c");

  const personaAResponse = await app.request("/personas", {
    method: "POST",
    headers: authHeaders(userA.accessToken),
    body: JSON.stringify({
      displayName: "Alice Filter",
      traits: ["warm"],
    }),
  });
  const personaBResponse = await app.request("/personas", {
    method: "POST",
    headers: authHeaders(userB.accessToken),
    body: JSON.stringify({
      displayName: "Bob Filter",
      traits: ["steady"],
    }),
  });
  const personaCResponse = await app.request("/personas", {
    method: "POST",
    headers: authHeaders(userC.accessToken),
    body: JSON.stringify({
      displayName: "Cara Filter",
      traits: ["curious"],
    }),
  });

  assert.equal(personaAResponse.status, 201);
  assert.equal(personaBResponse.status, 201);
  assert.equal(personaCResponse.status, 201);

  const personaAJson = await personaAResponse.json();
  const personaBJson = await personaBResponse.json();
  await personaCResponse.json();

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
        content: "昨晚我在楼下听到一阵风铃声，忽然很想把它讲给谁听。",
      }),
    },
  );
  assert.equal(messageResponse.status, 201);

  const chattedResponse = await app.request(
    `/discovery/personas?viewerPersonaId=${personaAJson.data.id}&relationshipFilter=chatted&limit=12&seed=discovery-filter`,
    {
      headers: authHeaders(userA.accessToken),
    },
  );
  assert.equal(chattedResponse.status, 200);

  const chattedJson = await chattedResponse.json();
  assert.equal(chattedJson.success, true);
  assert.equal(chattedJson.data.items.length, 1);
  assert.equal(chattedJson.data.items[0].id, personaBJson.data.id);
  assert.equal(chattedJson.data.items[0].relationship.hasHistory, true);

  const newResponse = await app.request(
    `/discovery/personas?viewerPersonaId=${personaAJson.data.id}&relationshipFilter=new&limit=12&seed=discovery-filter`,
    {
      headers: authHeaders(userA.accessToken),
    },
  );
  assert.equal(newResponse.status, 200);

  const newJson = await newResponse.json();
  assert.equal(newJson.success, true);
  assert.ok(newJson.data.items.length > 0);
  assert.ok(newJson.data.items.every((item: { id: string }) => item.id !== personaBJson.data.id));
  assert.ok(
    newJson.data.items.every(
      (item: { relationship?: { hasHistory?: boolean } }) => !item.relationship?.hasHistory,
    ),
  );
});

test("POST /sessions should honor configured session max rounds", async () => {
  const app = createTestApp({ sessionMaxRounds: 77 });
  const { userA, userB } = await registerPairAndCreateSession(app, "session-max-rounds");

  const personaAResponse = await app.request("/personas", {
    method: "POST",
    headers: authHeaders(userA.accessToken),
    body: JSON.stringify({
      displayName: "Alice Configured",
      traits: ["thoughtful"],
    }),
  });
  const personaBResponse = await app.request("/personas", {
    method: "POST",
    headers: authHeaders(userB.accessToken),
    body: JSON.stringify({
      displayName: "Bob Configured",
      traits: ["curious"],
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
  assert.equal(sessionJson.data.maxRounds, 77);
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
  const allTotalResponse = await app.request(`/personas?limit=1&seed=${seed}`);
  assert.equal(allTotalResponse.status, 200);
  const allTotalBody = await allTotalResponse.json();
  assert.equal(allTotalBody.success, true);
  assert.equal(firstPageBody.data.total, allTotalBody.data.total);
  assert.ok(firstPageBody.data.nextCursor);
  assert.notEqual(firstPageBody.data.items[0].userId, userA.userId);

  const secondPageResponse = await app.request(
    `/personas?excludeUserId=${userA.userId}&limit=1&seed=${seed}&cursor=${encodeURIComponent(firstPageBody.data.nextCursor)}`,
  );
  assert.equal(secondPageResponse.status, 200);

  const secondPageBody = await secondPageResponse.json();
  assert.equal(secondPageBody.success, true);
  assert.equal(secondPageBody.data.items.length, 1);
  assert.equal(secondPageBody.data.total, allTotalBody.data.total);
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

test("POST /admin/memory-items/batch should support partial success for update and delete", async () => {
  const app = createTestApp();
  const adminToken = createAdminAccessToken();
  const context = await registerPairAndCreateSession(app, "admin-memory-batch");

  const memoryIdA = `mem_${randomUUID().replace(/-/g, "")}`;
  const memoryIdB = `mem_${randomUUID().replace(/-/g, "")}`;
  const missingId = `mem_missing_${randomUUID().replace(/-/g, "")}`;

  await testDatabase.db.insert(dbSchema.memoryItems).values([
    {
      id: memoryIdA,
      personaId: context.initiatorPersonaId,
      sessionId: context.sessionId,
      category: "fact",
      content: "before-a",
      weight: 0.35,
      source: "agent_inferred",
    },
    {
      id: memoryIdB,
      personaId: context.initiatorPersonaId,
      sessionId: context.sessionId,
      category: "preference",
      content: "before-b",
      weight: 0.45,
      source: "human_override",
    },
  ]);

  const updateResponse = await app.request("/admin/memory-items/batch", {
    method: "POST",
    headers: adminAuthHeaders(adminToken),
    body: JSON.stringify({
      action: "update",
      memoryIds: [memoryIdA, memoryIdB, missingId],
      category: "instruction",
      weight: 0.9,
    }),
  });
  assert.equal(updateResponse.status, 200);
  const updateJson = await updateResponse.json();
  assert.equal(updateJson.success, true);
  assert.equal(updateJson.data.action, "update");
  assert.equal(updateJson.data.requestedCount, 3);
  assert.equal(updateJson.data.succeededCount, 2);
  assert.equal(updateJson.data.failedCount, 1);
  assert.equal(updateJson.data.failedItems[0].id, missingId);
  assert.equal(updateJson.data.failedItems[0].code, "MEMORY_ITEM_NOT_FOUND");

  const updatedRows = await testDatabase.db
    .select({
      id: dbSchema.memoryItems.id,
      category: dbSchema.memoryItems.category,
      weight: dbSchema.memoryItems.weight,
    })
    .from(dbSchema.memoryItems)
    .where(inArray(dbSchema.memoryItems.id, [memoryIdA, memoryIdB]));
  assert.equal(updatedRows.length, 2);
  for (const row of updatedRows) {
    assert.equal(row.category, "instruction");
    assert.ok(Math.abs((row.weight ?? 0) - 0.9) < 1e-6);
  }

  const deleteMissingId = `mem_missing_${randomUUID().replace(/-/g, "")}`;
  const deleteResponse = await app.request("/admin/memory-items/batch", {
    method: "POST",
    headers: adminAuthHeaders(adminToken),
    body: JSON.stringify({
      action: "delete",
      memoryIds: [memoryIdA, deleteMissingId],
    }),
  });
  assert.equal(deleteResponse.status, 200);
  const deleteJson = await deleteResponse.json();
  assert.equal(deleteJson.success, true);
  assert.equal(deleteJson.data.action, "delete");
  assert.equal(deleteJson.data.requestedCount, 2);
  assert.equal(deleteJson.data.succeededCount, 1);
  assert.equal(deleteJson.data.failedCount, 1);
  assert.equal(deleteJson.data.failedItems[0].id, deleteMissingId);
  assert.equal(deleteJson.data.failedItems[0].code, "MEMORY_ITEM_NOT_FOUND");

  const remainingRows = await testDatabase.db
    .select({ id: dbSchema.memoryItems.id })
    .from(dbSchema.memoryItems)
    .where(inArray(dbSchema.memoryItems.id, [memoryIdA, memoryIdB]));
  assert.equal(remainingRows.length, 1);
  assert.equal(remainingRows[0]?.id, memoryIdB);
});

test("POST /admin/configs/batch should delete existing keys and report missing keys", async () => {
  const app = createTestApp();
  const adminToken = createAdminAccessToken();

  const configKeyA = `feature_${randomUUID().replace(/-/g, "")}`;
  const configKeyB = `feature_${randomUUID().replace(/-/g, "")}`;
  const missingKey = `missing_${randomUUID().replace(/-/g, "")}`;

  await testDatabase.db.insert(dbSchema.systemConfigs).values([
    {
      id: `cfg_${randomUUID().replace(/-/g, "")}`,
      configKey: configKeyA,
      configValue: "on",
      valueType: "string",
      createdBy: "seed_admin",
      updatedBy: "seed_admin",
    },
    {
      id: `cfg_${randomUUID().replace(/-/g, "")}`,
      configKey: configKeyB,
      configValue: "42",
      valueType: "number",
      createdBy: "seed_admin",
      updatedBy: "seed_admin",
    },
  ]);

  const response = await app.request("/admin/configs/batch", {
    method: "POST",
    headers: adminAuthHeaders(adminToken),
    body: JSON.stringify({
      action: "delete",
      configKeys: [configKeyA, configKeyB, missingKey],
    }),
  });
  assert.equal(response.status, 200);
  const json = await response.json();
  assert.equal(json.success, true);
  assert.equal(json.data.action, "delete");
  assert.equal(json.data.requestedCount, 3);
  assert.equal(json.data.succeededCount, 2);
  assert.equal(json.data.failedCount, 1);
  assert.equal(json.data.failedItems[0].id, missingKey);
  assert.equal(json.data.failedItems[0].code, "CONFIG_NOT_FOUND");

  const remainingRows = await testDatabase.db
    .select({ key: dbSchema.systemConfigs.configKey })
    .from(dbSchema.systemConfigs)
    .where(inArray(dbSchema.systemConfigs.configKey, [configKeyA, configKeyB]));
  assert.equal(remainingRows.length, 0);
});

test("reports admin endpoints should support batch delete partial success and single delete not found", async () => {
  const app = createTestApp();
  const adminToken = createAdminAccessToken();
  const context = await registerPairAndCreateSession(app, "admin-reports-batch");

  const reportIdA = `rpt_${randomUUID().replace(/-/g, "")}`;
  const reportIdB = `rpt_${randomUUID().replace(/-/g, "")}`;
  const missingReportId = `rpt_missing_${randomUUID().replace(/-/g, "")}`;

  await testDatabase.db.insert(dbSchema.matchReports).values([
    {
      id: reportIdA,
      sessionId: context.sessionId,
      status: "completed",
      compatibilityScore: 0.72,
      summary: "batch delete target a",
      recommendation: "continue",
      analysisData: { source: "test-a" },
    },
    {
      id: reportIdB,
      sessionId: context.sessionId,
      status: "pending",
      compatibilityScore: 0.51,
      summary: "batch delete target b",
      recommendation: "review",
      analysisData: { source: "test-b" },
    },
  ]);

  const batchResponse = await app.request("/admin/reports/batch", {
    method: "POST",
    headers: adminAuthHeaders(adminToken),
    body: JSON.stringify({
      action: "delete",
      reportIds: [reportIdA, missingReportId],
    }),
  });
  assert.equal(batchResponse.status, 200);
  const batchJson = await batchResponse.json();
  assert.equal(batchJson.success, true);
  assert.equal(batchJson.data.action, "delete");
  assert.equal(batchJson.data.requestedCount, 2);
  assert.equal(batchJson.data.succeededCount, 1);
  assert.equal(batchJson.data.failedCount, 1);
  assert.equal(batchJson.data.failedItems[0].id, missingReportId);
  assert.equal(batchJson.data.failedItems[0].code, "REPORT_NOT_FOUND");

  const deleteResponse = await app.request(`/admin/reports/${reportIdB}`, {
    method: "DELETE",
    headers: adminAuthHeaders(adminToken),
  });
  assert.equal(deleteResponse.status, 200);
  const deleteJson = await deleteResponse.json();
  assert.equal(deleteJson.success, true);
  assert.equal(deleteJson.data.deleted, true);

  const deleteAgainResponse = await app.request(`/admin/reports/${reportIdB}`, {
    method: "DELETE",
    headers: adminAuthHeaders(adminToken),
  });
  assert.equal(deleteAgainResponse.status, 404);
  const deleteAgainJson = await deleteAgainResponse.json();
  assert.equal(deleteAgainJson.success, false);
  assert.equal(deleteAgainJson.error.code, "REPORT_NOT_FOUND");

  const remainingRows = await testDatabase.db
    .select({ id: dbSchema.matchReports.id })
    .from(dbSchema.matchReports)
    .where(inArray(dbSchema.matchReports.id, [reportIdA, reportIdB]));
  assert.equal(remainingRows.length, 0);
});
