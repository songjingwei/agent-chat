import { Hono } from "hono";

import { jsonOk } from "../../lib/http.js";
import { parseJsonBody } from "../../lib/validation.js";
import { authMiddleware } from "../../middleware/auth.js";
import {
  registerBodySchema,
  loginBodySchema,
  refreshBodySchema,
} from "../../schemas/auth.js";
import type { AuthService } from "../../services/auth.service.js";

export const createAuthRoutes = (authService: AuthService) => {
  const routes = new Hono();

  // Public endpoints
  routes.post("/auth/register", async (c) => {
    const body = await parseJsonBody(c, registerBodySchema);
    const result = await authService.register(body);
    return jsonOk(c, result, 201);
  });

  routes.post("/auth/login", async (c) => {
    const body = await parseJsonBody(c, loginBodySchema);
    const result = await authService.login(body);
    return jsonOk(c, result);
  });

  routes.post("/auth/refresh", async (c) => {
    const body = await parseJsonBody(c, refreshBodySchema);
    const tokens = await authService.refresh(body.refreshToken);
    return jsonOk(c, tokens);
  });

  // Protected endpoints
  routes.post("/auth/logout", authMiddleware, async (c) => {
    const body = await parseJsonBody(c, refreshBodySchema);
    await authService.logout(body.refreshToken);
    return jsonOk(c, { message: "Logged out" });
  });

  routes.get("/auth/me", authMiddleware, async (c) => {
    const userId = c.get("userId");
    const user = await authService.getProfile(userId);
    return jsonOk(c, user);
  });

  return routes;
};
