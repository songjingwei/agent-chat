import { HealthService } from "./health.service";
import { MessageService } from "./message.service";
import { PersonaService } from "./persona.service";
import { ReportService } from "./report.service";
import { SessionService } from "./session.service";
import { createInMemoryStore } from "./store";

export interface AppServices {
  healthService: HealthService;
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

  const healthService = options.healthService ?? new HealthService();
  const personaService = new PersonaService(store);
  const sessionService = new SessionService(store);
  const messageService = new MessageService(store, sessionService);
  const reportService = new ReportService(store);

  return {
    healthService,
    personaService,
    sessionService,
    messageService,
    reportService,
  };
};
