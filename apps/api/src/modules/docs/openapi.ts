const apiBaseUrl = "http://localhost:3001";

export const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "Agent API",
    version: "0.1.0",
    description:
      "HTTP API for auth, persona management, sessions, messages, and reports.",
  },
  servers: [
    {
      url: apiBaseUrl,
      description: "Local development",
    },
  ],
  tags: [
    { name: "System", description: "Service metadata and health checks." },
    { name: "Auth", description: "Authentication and token lifecycle." },
    { name: "Personas", description: "Persona read/write operations." },
    { name: "Sessions", description: "Conversation session lifecycle." },
    { name: "Messages", description: "Human intervention messages." },
    { name: "Reports", description: "Report querying endpoints." },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    schemas: {
      ErrorEnvelope: {
        type: "object",
        required: ["success", "error"],
        properties: {
          success: { type: "boolean", enum: [false] },
          error: {
            type: "object",
            required: ["code", "message"],
            properties: {
              code: { type: "string" },
              message: { type: "string" },
              details: {
                description:
                  "Optional context, usually validation details.",
              },
            },
          },
        },
      },
      RootStatus: {
        type: "object",
        required: ["service", "status", "version"],
        properties: {
          service: { type: "string" },
          status: { type: "string", enum: ["ready"] },
          version: { type: "string" },
        },
      },
      RootStatusEnvelope: {
        type: "object",
        required: ["success", "data"],
        properties: {
          success: { type: "boolean", enum: [true] },
          data: { $ref: "#/components/schemas/RootStatus" },
        },
      },
      HealthDependencyCheck: {
        type: "object",
        required: ["status", "target", "latencyMs"],
        properties: {
          status: { type: "string", enum: ["ok", "error"] },
          target: { type: "string" },
          latencyMs: { type: "number" },
          error: { type: "string" },
        },
      },
      HealthStatus: {
        type: "object",
        required: ["status", "service", "now", "uptimeSeconds", "checks"],
        properties: {
          status: { type: "string", enum: ["ok", "degraded"] },
          service: { type: "string" },
          now: { type: "string", format: "date-time" },
          uptimeSeconds: { type: "integer" },
          checks: {
            type: "object",
            required: ["inMemoryStore", "postgres", "redis"],
            properties: {
              inMemoryStore: {
                type: "object",
                required: ["status"],
                properties: {
                  status: { type: "string", enum: ["ok"] },
                },
              },
              postgres: { $ref: "#/components/schemas/HealthDependencyCheck" },
              redis: { $ref: "#/components/schemas/HealthDependencyCheck" },
            },
          },
        },
      },
      HealthEnvelope: {
        type: "object",
        required: ["success", "data"],
        properties: {
          success: { type: "boolean", enum: [true] },
          data: { $ref: "#/components/schemas/HealthStatus" },
        },
      },
      AuthUser: {
        type: "object",
        required: ["id", "email", "displayName", "createdAt"],
        properties: {
          id: { type: "string" },
          email: { type: "string", format: "email" },
          displayName: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      AuthTokens: {
        type: "object",
        required: ["accessToken", "refreshToken", "expiresIn"],
        properties: {
          accessToken: { type: "string" },
          refreshToken: { type: "string" },
          expiresIn: { type: "integer" },
        },
      },
      AuthResponse: {
        type: "object",
        required: ["user", "tokens"],
        properties: {
          user: { $ref: "#/components/schemas/AuthUser" },
          tokens: { $ref: "#/components/schemas/AuthTokens" },
        },
      },
      AuthResponseEnvelope: {
        type: "object",
        required: ["success", "data"],
        properties: {
          success: { type: "boolean", enum: [true] },
          data: { $ref: "#/components/schemas/AuthResponse" },
        },
      },
      AuthUserEnvelope: {
        type: "object",
        required: ["success", "data"],
        properties: {
          success: { type: "boolean", enum: [true] },
          data: { $ref: "#/components/schemas/AuthUser" },
        },
      },
      AuthTokensEnvelope: {
        type: "object",
        required: ["success", "data"],
        properties: {
          success: { type: "boolean", enum: [true] },
          data: { $ref: "#/components/schemas/AuthTokens" },
        },
      },
      LogoutResponseEnvelope: {
        type: "object",
        required: ["success", "data"],
        properties: {
          success: { type: "boolean", enum: [true] },
          data: {
            type: "object",
            required: ["message"],
            properties: {
              message: { type: "string" },
            },
          },
        },
      },
      RegisterRequest: {
        type: "object",
        required: ["email", "password", "displayName"],
        properties: {
          email: { type: "string", format: "email", maxLength: 255 },
          password: { type: "string", minLength: 8, maxLength: 128 },
          displayName: { type: "string", minLength: 1, maxLength: 80 },
        },
      },
      LoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string", minLength: 1 },
        },
      },
      RefreshTokenRequest: {
        type: "object",
        required: ["refreshToken"],
        properties: {
          refreshToken: { type: "string", minLength: 1 },
        },
      },
      Persona: {
        type: "object",
        required: [
          "id",
          "userId",
          "displayName",
          "traits",
          "createdAt",
          "updatedAt",
        ],
        properties: {
          id: { type: "string" },
          userId: { type: "string" },
          displayName: { type: "string" },
          bio: { type: "string" },
          traits: { type: "array", items: { type: "string" } },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      PersonaListResult: {
        type: "object",
        required: ["items", "total"],
        properties: {
          items: {
            type: "array",
            items: { $ref: "#/components/schemas/Persona" },
          },
          total: { type: "integer" },
          nextCursor: { type: "string", nullable: true },
        },
      },
      PersonaEnvelope: {
        type: "object",
        required: ["success", "data"],
        properties: {
          success: { type: "boolean", enum: [true] },
          data: { $ref: "#/components/schemas/Persona" },
        },
      },
      PersonaListEnvelope: {
        type: "object",
        required: ["success", "data"],
        properties: {
          success: { type: "boolean", enum: [true] },
          data: { $ref: "#/components/schemas/PersonaListResult" },
        },
      },
      BuildPersonaResult: {
        type: "object",
        required: ["persona", "generatedSystemPrompt", "version"],
        properties: {
          persona: { $ref: "#/components/schemas/Persona" },
          generatedSystemPrompt: { type: "string" },
          version: { type: "integer" },
        },
      },
      BuildPersonaEnvelope: {
        type: "object",
        required: ["success", "data"],
        properties: {
          success: { type: "boolean", enum: [true] },
          data: { $ref: "#/components/schemas/BuildPersonaResult" },
        },
      },
      ArchivePersonaEnvelope: {
        type: "object",
        required: ["success", "data"],
        properties: {
          success: { type: "boolean", enum: [true] },
          data: {
            type: "object",
            required: ["archived"],
            properties: {
              archived: { type: "boolean", enum: [true] },
            },
          },
        },
      },
      CreatePersonaRequest: {
        type: "object",
        required: ["displayName"],
        properties: {
          displayName: { type: "string", minLength: 1, maxLength: 80 },
          bio: { type: "string", maxLength: 1000 },
          traits: {
            type: "array",
            maxItems: 20,
            items: { type: "string", minLength: 1, maxLength: 80 },
            default: [],
          },
        },
      },
      BuildPersonaRequest: {
        type: "object",
        required: ["sourceText"],
        properties: {
          sourceText: { type: "string", minLength: 1, maxLength: 50000 },
          existingPersonaId: { type: "string", minLength: 1, maxLength: 64 },
        },
      },
      UpdatePersonaRequest: {
        type: "object",
        properties: {
          displayName: { type: "string", minLength: 1, maxLength: 80 },
          bio: { type: "string", maxLength: 1000 },
          traits: {
            type: "array",
            maxItems: 20,
            items: { type: "string", minLength: 1, maxLength: 80 },
          },
          systemPrompt: { type: "string", maxLength: 5000 },
        },
      },
      Session: {
        type: "object",
        required: [
          "id",
          "initiatorPersonaId",
          "targetPersonaId",
          "status",
          "currentRound",
          "maxRounds",
          "createdAt",
          "updatedAt",
        ],
        properties: {
          id: { type: "string" },
          initiatorPersonaId: { type: "string" },
          targetPersonaId: { type: "string" },
          status: { type: "string", enum: ["queued", "active", "completed"] },
          currentRound: { type: "integer" },
          maxRounds: { type: "integer" },
          lastMessageContent: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      SessionListResult: {
        type: "object",
        required: ["items", "total"],
        properties: {
          items: {
            type: "array",
            items: { $ref: "#/components/schemas/Session" },
          },
          total: { type: "integer" },
        },
      },
      SessionEnvelope: {
        type: "object",
        required: ["success", "data"],
        properties: {
          success: { type: "boolean", enum: [true] },
          data: { $ref: "#/components/schemas/Session" },
        },
      },
      SessionListEnvelope: {
        type: "object",
        required: ["success", "data"],
        properties: {
          success: { type: "boolean", enum: [true] },
          data: { $ref: "#/components/schemas/SessionListResult" },
        },
      },
      CreateSessionRequest: {
        type: "object",
        required: ["initiatorPersonaId", "targetPersonaId"],
        properties: {
          initiatorPersonaId: { type: "string", minLength: 1 },
          targetPersonaId: { type: "string", minLength: 1 },
        },
      },
      ChatMessage: {
        type: "object",
        required: [
          "id",
          "sessionId",
          "authorPersonaId",
          "role",
          "content",
          "createdAt",
        ],
        properties: {
          id: { type: "string" },
          sessionId: { type: "string" },
          authorPersonaId: { type: "string" },
          role: { type: "string", enum: ["agent", "human", "system"] },
          content: { type: "string" },
          metadata: {
            type: "object",
            additionalProperties: true,
          },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      ChatMessageListResult: {
        type: "object",
        required: ["items", "total"],
        properties: {
          items: {
            type: "array",
            items: { $ref: "#/components/schemas/ChatMessage" },
          },
          total: { type: "integer" },
        },
      },
      ChatMessageEnvelope: {
        type: "object",
        required: ["success", "data"],
        properties: {
          success: { type: "boolean", enum: [true] },
          data: { $ref: "#/components/schemas/ChatMessage" },
        },
      },
      ChatMessageListEnvelope: {
        type: "object",
        required: ["success", "data"],
        properties: {
          success: { type: "boolean", enum: [true] },
          data: { $ref: "#/components/schemas/ChatMessageListResult" },
        },
      },
      CreateHumanMessageRequest: {
        type: "object",
        required: ["authorPersonaId", "content"],
        properties: {
          authorPersonaId: { type: "string", minLength: 1 },
          content: { type: "string", minLength: 1, maxLength: 2000 },
        },
      },
      LatestReport: {
        type: "object",
        required: [
          "personaId",
          "sessionId",
          "generatedAt",
          "sessionStatus",
          "totalMessages",
          "latestMessagePreview",
          "recommendation",
          "rationale",
        ],
        properties: {
          personaId: { type: "string" },
          sessionId: { type: "string" },
          generatedAt: { type: "string", format: "date-time" },
          sessionStatus: {
            type: "string",
            enum: ["queued", "active", "completed"],
          },
          totalMessages: { type: "integer" },
          latestMessagePreview: { type: "string", nullable: true },
          recommendation: { type: "string" },
          rationale: { type: "string" },
        },
      },
      LatestReportEnvelope: {
        type: "object",
        required: ["success", "data"],
        properties: {
          success: { type: "boolean", enum: [true] },
          data: { $ref: "#/components/schemas/LatestReport" },
        },
      },
    },
  },
  paths: {
    "/": {
      get: {
        tags: ["System"],
        summary: "Service readiness summary",
        responses: {
          "200": {
            description: "Service metadata",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/RootStatusEnvelope" },
              },
            },
          },
        },
      },
    },
    "/health": {
      get: {
        tags: ["System"],
        summary: "Health check",
        responses: {
          "200": {
            description: "Dependency health status",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/HealthEnvelope" },
              },
            },
          },
        },
      },
    },
    "/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register a user",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RegisterRequest" },
            },
          },
        },
        responses: {
          "201": {
            description: "User registered",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuthResponseEnvelope" },
              },
            },
          },
          "409": {
            description: "Email already exists",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorEnvelope" },
              },
            },
          },
          "400": {
            description: "Validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorEnvelope" },
              },
            },
          },
        },
      },
    },
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login with email and password",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/LoginRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Authenticated",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuthResponseEnvelope" },
              },
            },
          },
          "401": {
            description: "Invalid credentials",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorEnvelope" },
              },
            },
          },
          "400": {
            description: "Validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorEnvelope" },
              },
            },
          },
        },
      },
    },
    "/auth/refresh": {
      post: {
        tags: ["Auth"],
        summary: "Rotate refresh token and return new tokens",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RefreshTokenRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "New token pair",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuthTokensEnvelope" },
              },
            },
          },
          "401": {
            description: "Refresh token invalid or expired",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorEnvelope" },
              },
            },
          },
          "400": {
            description: "Validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorEnvelope" },
              },
            },
          },
        },
      },
    },
    "/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Logout and revoke refresh token",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RefreshTokenRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Logout success",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/LogoutResponseEnvelope" },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorEnvelope" },
              },
            },
          },
          "400": {
            description: "Validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorEnvelope" },
              },
            },
          },
        },
      },
    },
    "/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Current user profile",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Current user",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuthUserEnvelope" },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorEnvelope" },
              },
            },
          },
          "404": {
            description: "User not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorEnvelope" },
              },
            },
          },
        },
      },
    },
    "/personas": {
      get: {
        tags: ["Personas"],
        summary: "List public personas",
        parameters: [
          {
            in: "query",
            name: "cursor",
            required: false,
            schema: { type: "string", minLength: 1 },
          },
          {
            in: "query",
            name: "limit",
            required: false,
            schema: { type: "integer", minimum: 1, maximum: 50, default: 24 },
          },
          {
            in: "query",
            name: "excludeUserId",
            required: false,
            schema: { type: "string", minLength: 1, maxLength: 64 },
          },
          {
            in: "query",
            name: "seed",
            required: false,
            schema: {
              type: "string",
              minLength: 1,
              maxLength: 120,
              default: "default-seed",
            },
          },
        ],
        responses: {
          "200": {
            description: "Persona list",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PersonaListEnvelope" },
              },
            },
          },
          "400": {
            description: "Validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorEnvelope" },
              },
            },
          },
        },
      },
      post: {
        tags: ["Personas"],
        summary: "Create persona",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreatePersonaRequest" },
            },
          },
        },
        responses: {
          "201": {
            description: "Created persona",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PersonaEnvelope" },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorEnvelope" },
              },
            },
          },
          "404": {
            description: "User not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorEnvelope" },
              },
            },
          },
          "400": {
            description: "Validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorEnvelope" },
              },
            },
          },
        },
      },
    },
    "/personas/{personaId}": {
      get: {
        tags: ["Personas"],
        summary: "Get persona detail",
        parameters: [
          {
            in: "path",
            name: "personaId",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Persona detail",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PersonaEnvelope" },
              },
            },
          },
          "404": {
            description: "Persona not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorEnvelope" },
              },
            },
          },
        },
      },
      patch: {
        tags: ["Personas"],
        summary: "Update persona",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "personaId",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdatePersonaRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Updated persona",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PersonaEnvelope" },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorEnvelope" },
              },
            },
          },
          "404": {
            description: "Persona not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorEnvelope" },
              },
            },
          },
          "400": {
            description: "Validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorEnvelope" },
              },
            },
          },
        },
      },
    },
    "/my/personas": {
      get: {
        tags: ["Personas"],
        summary: "List current user's personas",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Current user's personas",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PersonaListEnvelope" },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorEnvelope" },
              },
            },
          },
        },
      },
    },
    "/personas/build": {
      post: {
        tags: ["Personas"],
        summary: "Generate persona profile from source text",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/BuildPersonaRequest" },
            },
          },
        },
        responses: {
          "201": {
            description: "Persona build result",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/BuildPersonaEnvelope" },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorEnvelope" },
              },
            },
          },
          "400": {
            description: "Validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorEnvelope" },
              },
            },
          },
        },
      },
    },
    "/personas/{personaId}/archive": {
      post: {
        tags: ["Personas"],
        summary: "Archive persona",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "personaId",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Persona archived",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ArchivePersonaEnvelope" },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorEnvelope" },
              },
            },
          },
          "404": {
            description: "Persona not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorEnvelope" },
              },
            },
          },
        },
      },
    },
    "/personas/{personaId}/activate": {
      post: {
        tags: ["Personas"],
        summary: "Activate persona",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "personaId",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Persona activated",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PersonaEnvelope" },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorEnvelope" },
              },
            },
          },
          "404": {
            description: "Persona not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorEnvelope" },
              },
            },
          },
        },
      },
    },
    "/sessions": {
      post: {
        tags: ["Sessions"],
        summary: "Create session",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateSessionRequest" },
            },
          },
        },
        responses: {
          "201": {
            description: "Created session",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SessionEnvelope" },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorEnvelope" },
              },
            },
          },
          "404": {
            description: "Persona not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorEnvelope" },
              },
            },
          },
          "400": {
            description: "Validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorEnvelope" },
              },
            },
          },
        },
      },
      get: {
        tags: ["Sessions"],
        summary: "List sessions",
        description:
          "Returns sessions visible to current authenticated user. Optional `personaId` can further filter results.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "query",
            name: "personaId",
            required: false,
            schema: { type: "string", minLength: 1 },
          },
        ],
        responses: {
          "200": {
            description: "Session list",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SessionListEnvelope" },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorEnvelope" },
              },
            },
          },
          "400": {
            description: "Validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorEnvelope" },
              },
            },
          },
        },
      },
    },
    "/sessions/{sessionId}": {
      get: {
        tags: ["Sessions"],
        summary: "Get session detail",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "sessionId",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Session detail",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SessionEnvelope" },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorEnvelope" },
              },
            },
          },
          "404": {
            description: "Session not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorEnvelope" },
              },
            },
          },
        },
      },
    },
    "/sessions/{sessionId}/force-end": {
      post: {
        tags: ["Sessions"],
        summary: "Force end a session",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "sessionId",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Updated session",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SessionEnvelope" },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorEnvelope" },
              },
            },
          },
          "404": {
            description: "Session not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorEnvelope" },
              },
            },
          },
        },
      },
    },
    "/sessions/{sessionId}/human-message": {
      post: {
        tags: ["Messages"],
        summary: "Create human message",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "sessionId",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/CreateHumanMessageRequest",
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Created message",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ChatMessageEnvelope" },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorEnvelope" },
              },
            },
          },
          "404": {
            description: "Session not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorEnvelope" },
              },
            },
          },
          "400": {
            description: "Invalid author or validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorEnvelope" },
              },
            },
          },
        },
      },
    },
    "/sessions/{sessionId}/messages": {
      get: {
        tags: ["Messages"],
        summary: "List messages by session",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "sessionId",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Message list",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ChatMessageListEnvelope" },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorEnvelope" },
              },
            },
          },
          "404": {
            description: "Session not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorEnvelope" },
              },
            },
          },
        },
      },
    },
    "/reports/latest": {
      get: {
        tags: ["Reports"],
        summary: "Get latest report by persona",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "query",
            name: "personaId",
            required: true,
            schema: { type: "string", minLength: 1 },
          },
        ],
        responses: {
          "200": {
            description: "Latest report",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/LatestReportEnvelope" },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorEnvelope" },
              },
            },
          },
          "404": {
            description: "Persona or report not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorEnvelope" },
              },
            },
          },
          "400": {
            description: "Validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorEnvelope" },
              },
            },
          },
        },
      },
    },
  },
} as const;

export type OpenApiLocale = "en" | "zh";

export const resolveOpenApiLocale = (value: string | undefined): OpenApiLocale => {
  return value === "zh" ? "zh" : "en";
};

const buildZhOpenApiDocument = () => {
  const localized = JSON.parse(JSON.stringify(openApiDocument)) as any;

  localized.info.title = "Agent API 接口文档";
  localized.info.description = "涵盖认证、人格、会话、消息与报告的 HTTP API。";

  const zhTagDescriptionMap: Record<string, string> = {
    System: "服务元信息与健康检查。",
    Auth: "认证与令牌生命周期管理。",
    Personas: "人格读取与写入操作。",
    Sessions: "会话生命周期管理。",
    Messages: "人工介入消息相关接口。",
    Reports: "报告查询接口。",
  };

  for (const tag of localized.tags ?? []) {
    const zhDescription = zhTagDescriptionMap[tag.name];
    if (zhDescription) {
      tag.description = zhDescription;
    }
  }

  const zhOperationMap: Record<
    string,
    Record<string, { summary?: string; description?: string }>
  > = {
    "/": {
      get: { summary: "获取服务就绪信息" },
    },
    "/health": {
      get: { summary: "获取健康检查状态" },
    },
    "/auth/register": {
      post: { summary: "注册用户" },
    },
    "/auth/login": {
      post: { summary: "邮箱密码登录" },
    },
    "/auth/refresh": {
      post: { summary: "刷新令牌并轮换 refresh token" },
    },
    "/auth/logout": {
      post: { summary: "登出并撤销 refresh token" },
    },
    "/auth/me": {
      get: { summary: "获取当前用户资料" },
    },
    "/personas": {
      get: { summary: "获取公开人格列表" },
      post: { summary: "创建人格" },
    },
    "/personas/{personaId}": {
      get: { summary: "获取人格详情" },
      patch: { summary: "更新人格" },
    },
    "/my/personas": {
      get: { summary: "获取当前用户的人格列表" },
    },
    "/personas/build": {
      post: { summary: "基于文本生成人格" },
    },
    "/personas/{personaId}/archive": {
      post: { summary: "归档人格" },
    },
    "/personas/{personaId}/activate": {
      post: { summary: "激活人格" },
    },
    "/sessions": {
      post: { summary: "创建会话" },
      get: {
        summary: "获取会话列表",
        description:
          "返回当前已认证用户可见的会话。可选 `personaId` 进一步筛选。",
      },
    },
    "/sessions/{sessionId}": {
      get: { summary: "获取会话详情" },
    },
    "/sessions/{sessionId}/force-end": {
      post: { summary: "强制结束会话" },
    },
    "/sessions/{sessionId}/human-message": {
      post: { summary: "发送人工消息" },
    },
    "/sessions/{sessionId}/messages": {
      get: { summary: "获取会话消息列表" },
    },
    "/reports/latest": {
      get: { summary: "按人格获取最新报告" },
    },
  };

  for (const [path, methods] of Object.entries(zhOperationMap)) {
    const pathItem = localized.paths[path];
    if (!pathItem) {
      continue;
    }

    for (const [method, translation] of Object.entries(methods)) {
      const operation = pathItem[method];
      if (!operation) {
        continue;
      }

      if (translation.summary) {
        operation.summary = translation.summary;
      }

      if (translation.description) {
        operation.description = translation.description;
      }
    }
  }

  const errorDetailsDescription =
    localized.components?.schemas?.ErrorEnvelope?.properties?.error?.properties
      ?.details;
  if (errorDetailsDescription) {
    errorDetailsDescription.description =
      "可选上下文信息，通常用于展示校验错误详情。";
  }

  return localized;
};

const openApiDocuments: Record<OpenApiLocale, unknown> = {
  en: openApiDocument,
  zh: buildZhOpenApiDocument(),
};

export const getOpenApiDocument = (locale: OpenApiLocale) => {
  return openApiDocuments[locale];
};
