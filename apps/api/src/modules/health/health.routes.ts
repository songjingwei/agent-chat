import { Hono } from "hono";

import { jsonOk } from "../../lib/http";
import type { HealthService } from "../../services/health.service";

export const createHealthRoutes = (healthService: HealthService) => {
  const routes = new Hono();

  routes.get("/health", (c) => {
    return jsonOk(c, healthService.getStatus());
  });

  return routes;
};
