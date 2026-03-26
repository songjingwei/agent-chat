import { Hono } from "hono";

import { jsonOk } from "../../lib/http.js";
import { parseJsonBody } from "../../lib/validation.js";
import { adminAuthMiddleware } from "../../middleware/admin-auth.js";
import {
  adminLoginBodySchema,
  adminRefreshBodySchema,
} from "../../schemas/admin-auth.js";
import type { AdminAuthService } from "../../services/admin-auth.service.js";

export const createAdminAuthRoutes = (adminAuthService: AdminAuthService) => {
  const routes = new Hono();

  routes.post("/admin/auth/login", async (c) => {
    const body = await parseJsonBody(c, adminLoginBodySchema);
    const result = await adminAuthService.login(body);
    return jsonOk(c, result);
  });

  routes.post("/admin/auth/refresh", async (c) => {
    const body = await parseJsonBody(c, adminRefreshBodySchema);
    const tokens = await adminAuthService.refresh(body.refreshToken);
    return jsonOk(c, tokens);
  });

  routes.post("/admin/auth/logout", adminAuthMiddleware, async (c) => {
    const body = await parseJsonBody(c, adminRefreshBodySchema);
    await adminAuthService.logout(body.refreshToken);
    return jsonOk(c, { message: "Logged out" });
  });

  routes.get("/admin/auth/me", adminAuthMiddleware, async (c) => {
    const adminId = c.get("adminId");
    const admin = await adminAuthService.getProfile(adminId);
    return jsonOk(c, admin);
  });

  return routes;
};
