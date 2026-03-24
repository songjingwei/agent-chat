import { createDbClient } from "@agent/db";

import { apiConfig } from "../config.js";
import { AuthService } from "./auth.service.js";
import { HealthService } from "./health.service.js";
import { MessageService } from "./message.service.js";
import { PersonaService } from "./persona.service.js";
import { ReportService } from "./report.service.js";
import { RuntimeService } from "./runtime.service.js";
import { SessionService } from "./session.service.js";

export interface AppServices {
  healthService: HealthService;
  authService: AuthService;
  personaService: PersonaService;
  sessionService: SessionService;
  messageService: MessageService;
  reportService: ReportService;
  runtimeService: RuntimeService;
}

export interface CreateServicesOptions {
  healthService?: HealthService;
  runtimeService?: RuntimeService;
}

export const createServices = (
  options: CreateServicesOptions = {},
): AppServices => {
  const db = createDbClient(apiConfig.databaseUrl);

  const healthService = options.healthService ?? new HealthService();
  const authService = new AuthService(db, {
    jwtSecret: apiConfig.jwtSecret,
    jwtAccessExpiresIn: apiConfig.jwtAccessExpiresIn,
    jwtRefreshExpiresIn: apiConfig.jwtRefreshExpiresIn,
  });
  const personaService = new PersonaService(db);
  const sessionService = new SessionService(db);
  const messageService = new MessageService(db, sessionService);
  const reportService = new ReportService(db);
  const runtimeService =
    options.runtimeService ??
    new RuntimeService({
      db,
      env: {
        RUNTIME_MODEL_PROVIDER: apiConfig.runtimeModelProvider,
        RUNTIME_MODEL_TIMEOUT_MS: String(apiConfig.runtimeModelTimeoutMs),
        OPENAI_API_KEY: apiConfig.openAIApiKey,
        OPENAI_BASE_URL: apiConfig.openAIBaseUrl,
        OPENAI_MODEL_CHAT: apiConfig.openAIModelChat,
        ANTHROPIC_API_KEY: apiConfig.anthropicApiKey,
        ANTHROPIC_BASE_URL: apiConfig.anthropicBaseUrl,
        ANTHROPIC_MODEL_CHAT: apiConfig.anthropicModelChat,
        OLLAMA_BASE_URL: apiConfig.ollamaBaseUrl,
        OLLAMA_MODEL_CHAT: apiConfig.ollamaModelChat,
      },
    });

  return {
    healthService,
    authService,
    personaService,
    sessionService,
    messageService,
    reportService,
    runtimeService,
  };
};
