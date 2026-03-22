import { createDbClient } from "@agent/db";

import { apiConfig } from "../config.js";
import { AuthService } from "./auth.service.js";
import { HealthService } from "./health.service.js";
import { MessageService } from "./message.service.js";
import { PersonaService } from "./persona.service.js";
import { ReportService } from "./report.service.js";
import { SessionService } from "./session.service.js";
import { createInMemoryStore } from "./store.js";

export interface AppServices {
  healthService: HealthService;
  authService: AuthService;
  personaService: PersonaService;
  sessionService: SessionService;
  messageService: MessageService;
  reportService: ReportService;
}

export interface CreateServicesOptions {
  healthService?: HealthService;
}

export const createServices = (
  options: CreateServicesOptions = {},
): AppServices => {
  const store = createInMemoryStore();
  const db = createDbClient(apiConfig.databaseUrl);

  const healthService = options.healthService ?? new HealthService();
  const authService = new AuthService(db, {
    jwtSecret: apiConfig.jwtSecret,
    jwtAccessExpiresIn: apiConfig.jwtAccessExpiresIn,
    jwtRefreshExpiresIn: apiConfig.jwtRefreshExpiresIn,
  });
  const personaService = new PersonaService(store);
  const sessionService = new SessionService(store);
  const messageService = new MessageService(store, sessionService);
  const reportService = new ReportService(store);

  return {
    healthService,
    authService,
    personaService,
    sessionService,
    messageService,
    reportService,
  };
};
