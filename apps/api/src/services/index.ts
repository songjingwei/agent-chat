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

export const createServices = (): AppServices => {
  const store = createInMemoryStore();

  const healthService = new HealthService();
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
