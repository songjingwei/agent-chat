import { Hono } from "hono";

import { apiConfig } from "../config.js";
import { jsonOk } from "../lib/http.js";
import { authMiddleware } from "../middleware/auth.js";
import { adminAuthMiddleware } from "../middleware/admin-auth.js";
import { createAuthRoutes } from "../modules/auth/auth.routes.js";
import { createAdminAuthRoutes } from "../modules/admin/admin-auth.routes.js";
import { createAdminUsersRoutes } from "../modules/admin/admin-users.routes.js";
import { createAdminPersonasRoutes } from "../modules/admin/admin-personas.routes.js";
import { createAdminSessionsRoutes } from "../modules/admin/admin-sessions.routes.js";
import { createAdminMessagesRoutes } from "../modules/admin/admin-messages.routes.js";
import { createAdminReportsRoutes } from "../modules/admin/admin-reports.routes.js";
import { createAdminMemoryRoutes } from "../modules/admin/admin-memory.routes.js";
import { createAdminConfigRoutes } from "../modules/admin/admin-config.routes.js";
import { createAdminStatsRoutes } from "../modules/admin/admin-stats.routes.js";
import { createDocsRoutes } from "../modules/docs/docs.routes.js";
import { createHealthRoutes } from "../modules/health/health.routes.js";
import { createMessageRoutes } from "../modules/messages/messages.routes.js";
import { createPersonaPublicRoutes, createPersonaRoutes } from "../modules/personas/personas.routes.js";
import { createReportRoutes } from "../modules/reports/reports.routes.js";
import { createSessionRoutes } from "../modules/sessions/sessions.routes.js";
import { createBullBoardRoutes } from "../modules/bull-board/bull-board.routes.js";
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

  app.route("/", createDocsRoutes());
  app.route("/", createHealthRoutes(services.healthService));
  app.route("/", createAuthRoutes(services.authService));
  app.route("/", createPersonaPublicRoutes(services.personaService));
  app.route("/", createAdminAuthRoutes(services.adminAuthService));

  // Protected routes — require JWT
  const protectedApp = new Hono();
  protectedApp.use("*", authMiddleware);
  protectedApp.route(
    "/",
    createPersonaRoutes({
      personaService: services.personaService,
      personaBuilderService: services.personaBuilderService,
      personaEditorService: services.personaEditorService,
      pairInsightService: services.pairInsightService,
    }),
  );
  protectedApp.route(
    "/",
    createSessionRoutes({
      sessionService: services.sessionService,
      conversationOrchestrator: services.conversationOrchestrator,
    }),
  );
  protectedApp.route(
    "/",
    createMessageRoutes({
      messageService: services.messageService,
      conversationOrchestrator: services.conversationOrchestrator,
    }),
  );
  protectedApp.route("/", createReportRoutes(services.reportService));
  app.route("/", protectedApp);

  // Admin CRUD routes — require admin JWT
  const adminApp = new Hono();
  adminApp.use("*", adminAuthMiddleware);
  adminApp.route("/", createAdminUsersRoutes(services.db));
  adminApp.route("/", createAdminPersonasRoutes(services.db));
  adminApp.route("/", createAdminSessionsRoutes(services.db));
  adminApp.route("/", createAdminMessagesRoutes(services.db));
  adminApp.route("/", createAdminReportsRoutes(services.db));
  adminApp.route("/", createAdminMemoryRoutes(services.db));
  adminApp.route("/", createAdminConfigRoutes(services.db));
  adminApp.route("/", createAdminStatsRoutes(services.db));
  app.route("/admin", adminApp);
};
