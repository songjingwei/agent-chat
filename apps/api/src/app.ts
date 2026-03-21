import { Hono } from "hono";

import { ApiError } from "./lib/api-error";
import { jsonError } from "./lib/http";
import { createId } from "./lib/id";
import { registerRoutes } from "./routes";
import { createServices, type AppServices } from "./services";

export const createApp = (services: AppServices = createServices()) => {
  const app = new Hono();

  app.use("*", async (c, next) => {
    const requestId = c.req.header("x-request-id") ?? createId("req");
    c.header("x-request-id", requestId);
    await next();
  });

  registerRoutes(app, services);

  app.notFound((c) => {
    return jsonError(c, 404, "NOT_FOUND", `Route not found: ${c.req.method} ${c.req.path}`);
  });

  app.onError((error, c) => {
    if (error instanceof ApiError) {
      return jsonError(c, error.status, error.code, error.message, error.details);
    }

    console.error("[api] unhandled error", error);
    return jsonError(c, 500, "INTERNAL_ERROR", "Internal server error.");
  });

  return app;
};
