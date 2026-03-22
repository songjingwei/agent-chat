import { Hono } from "hono";

import { jsonOk } from "../../lib/http";
import type { HealthService } from "../../services/health.service";

export const createHealthRoutes = (healthService: HealthService) => {
  const routes = new Hono();

  routes.get("/health", async (c) => {
    return jsonOk(c, await healthService.getStatus());
  });

  return routes;
};
