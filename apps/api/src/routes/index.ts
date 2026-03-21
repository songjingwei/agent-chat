import type { Hono } from "hono";

import { apiConfig } from "../config";
import { jsonOk } from "../lib/http";
import { createHealthRoutes } from "../modules/health/health.routes";
import { createMessageRoutes } from "../modules/messages/messages.routes";
import { createPersonaRoutes } from "../modules/personas/personas.routes";
import { createReportRoutes } from "../modules/reports/reports.routes";
import { createSessionRoutes } from "../modules/sessions/sessions.routes";
import type { AppServices } from "../services";

export const registerRoutes = (app: Hono, services: AppServices) => {
  app.get("/", (c) => {
    return jsonOk(c, {
      service: apiConfig.serviceName,
      status: "ready",
      version: "0.1.0",
    });
  });

  app.route("/", createHealthRoutes(services.healthService));
  app.route("/", createPersonaRoutes(services.personaService));
  app.route("/", createSessionRoutes(services.sessionService));
  app.route("/", createMessageRoutes(services.messageService));
  app.route("/", createReportRoutes(services.reportService));
};
