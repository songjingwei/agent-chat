import type { Hono } from "hono";

import { apiConfig } from "../config.js";
import { jsonOk } from "../lib/http.js";
import { createHealthRoutes } from "../modules/health/health.routes.js";
import { createMessageRoutes } from "../modules/messages/messages.routes.js";
import { createPersonaRoutes } from "../modules/personas/personas.routes.js";
import { createReportRoutes } from "../modules/reports/reports.routes.js";
import { createSessionRoutes } from "../modules/sessions/sessions.routes.js";
import type { AppServices } from "../services/index.js";

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
