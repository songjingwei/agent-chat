import { createDbClient, type DbClient } from "@agent/db";
import { createRuntimeModelClient } from "@agent/runtime";

import { apiConfig } from "../config.js";
import { AdminAuthService } from "./admin-auth.service.js";
import { AuthService } from "./auth.service.js";
import {
  InProcessConversationOrchestratorService,
  type ConversationOrchestrator,
} from "./conversation-orchestrator.service.js";
import { HealthService } from "./health.service.js";
import { MessageService } from "./message.service.js";
import { PairInsightService } from "./pair-insight.service.js";
import { PersonaBuilderService } from "./persona-builder.service.js";
import { PersonaEditorService } from "./persona-editor.service.js";
import { PersonaService } from "./persona.service.js";
import { ReportService } from "./report.service.js";
import { RuntimeService } from "./runtime.service.js";
import { SessionService } from "./session.service.js";

export interface AppServices {
  db: DbClient;
  healthService: HealthService;
  authService: AuthService;
  adminAuthService: AdminAuthService;
  personaService: PersonaService;
  personaBuilderService: PersonaBuilderService;
  personaEditorService: PersonaEditorService;
  pairInsightService: PairInsightService;
  sessionService: SessionService;
  messageService: MessageService;
  reportService: ReportService;
  runtimeService: RuntimeService;
  conversationOrchestrator: ConversationOrchestrator;
}

export interface CreateServicesOptions {
  healthService?: HealthService;
  runtimeService?: RuntimeService;
  conversationOrchestrator?: ConversationOrchestrator;
}

const buildRuntimeModelEnv = () => ({
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
});

export const createServices = (
  options: CreateServicesOptions = {},
): AppServices => {
  const db = createDbClient(apiConfig.databaseUrl);
  const runtimeModelEnv = buildRuntimeModelEnv();
  const modelClient = createRuntimeModelClient(runtimeModelEnv);

  const healthService = options.healthService ?? new HealthService();
  const authService = new AuthService(db, {
    jwtSecret: apiConfig.jwtSecret,
    jwtAccessExpiresIn: apiConfig.jwtAccessExpiresIn,
    jwtRefreshExpiresIn: apiConfig.jwtRefreshExpiresIn,
  });
  const adminAuthService = new AdminAuthService(db, {
    jwtSecret: apiConfig.jwtSecret,
    jwtAccessExpiresIn: apiConfig.jwtAccessExpiresIn,
    jwtRefreshExpiresIn: apiConfig.jwtRefreshExpiresIn,
  });
  const personaService = new PersonaService(db);
  const personaBuilderService = new PersonaBuilderService(db, { modelClient });
  const personaEditorService = new PersonaEditorService(db);
  const pairInsightService = new PairInsightService(db);
  const sessionService = new SessionService(db, {
    defaultMaxRounds: apiConfig.sessionMaxRounds,
  });
  const messageService = new MessageService(
    db,
    sessionService,
    pairInsightService,
  );
  const reportService = new ReportService(db);
  const runtimeService =
    options.runtimeService ??
    new RuntimeService({ db, env: runtimeModelEnv });
  const conversationOrchestrator =
    options.conversationOrchestrator ??
    new InProcessConversationOrchestratorService({
      messageService,
      sessionService,
      personaService,
      runtimeService,
    });

  return {
    db,
    healthService,
    authService,
    adminAuthService,
    personaService,
    personaBuilderService,
    personaEditorService,
    pairInsightService,
    sessionService,
    messageService,
    reportService,
    runtimeService,
    conversationOrchestrator,
  };
};
