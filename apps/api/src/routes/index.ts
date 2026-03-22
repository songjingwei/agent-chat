import { Hono } from "hono";

import { apiConfig } from "../config.js";
import { jsonOk } from "../lib/http.js";
import { authMiddleware } from "../middleware/auth.js";
import { createAuthRoutes } from "../modules/auth/auth.routes.js";
import { createHealthRoutes } from "../modules/health/health.routes.js";
import { createMessageRoutes } from "../modules/messages/messages.routes.js";
import { createPersonaRoutes } from "../modules/personas/personas.routes.js";
import { createReportRoutes } from "../modules/reports/reports.routes.js";
import { createSessionRoutes } from "../modules/sessions/sessions.routes.js";
import type { AppServices } from "../services/index.js";

export const registerRoutes = (app: Hono, services: AppServices) => {
  // Public routes
  app.get("/", (c) => {
    return jsonOk(c, {
      service: apiConfig.serviceName,
      status: "ready",
      version: "0.1.0",
    });
  });

  app.route("/", createHealthRoutes(services.healthService));
  app.route("/", createAuthRoutes(services.authService));

  // Protected routes — require JWT
  const protectedApp = new Hono();
  protectedApp.use("*", authMiddleware);
  protectedApp.route("/", createPersonaRoutes(services.personaService));
  protectedApp.route("/", createSessionRoutes(services.sessionService));
  protectedApp.route("/", createMessageRoutes(services.messageService));
  protectedApp.route("/", createReportRoutes(services.reportService));
  app.route("/", protectedApp);
};
