import { Hono } from "hono";

import { ApiError } from "./lib/api-error.js";
import { jsonError } from "./lib/http.js";
import { createId } from "./lib/id.js";
import { registerRoutes } from "./routes/index.js";
import { createServices, type AppServices } from "./services/index.js";

const getDurationMs = (startedAt: number) => {
  return Number((performance.now() - startedAt).toFixed(2));
};

export const createApp = (services: AppServices = createServices()) => {
  const app = new Hono();
  const requestIds = new WeakMap<Request, string>();
  const requestStartedAts = new WeakMap<Request, number>();

  app.use("*", async (c, next) => {
    const requestId = c.req.header("x-request-id") ?? createId("req");
    const startedAt = performance.now();

    requestIds.set(c.req.raw, requestId);
    requestStartedAts.set(c.req.raw, startedAt);
    c.header("x-request-id", requestId);

    await next();

    console.info(
      "[api] request",
      JSON.stringify({
        requestId,
        method: c.req.method,
        path: c.req.path,
        status: c.res.status,
        durationMs: getDurationMs(startedAt),
      }),
    );
  });

  registerRoutes(app, services);

  app.notFound((c) => {
    return jsonError(c, 404, "NOT_FOUND", `Route not found: ${c.req.method} ${c.req.path}`);
  });

  app.onError((error, c) => {
    const requestId =
      requestIds.get(c.req.raw) ??
      c.req.header("x-request-id") ??
      "unknown";
    const startedAt = requestStartedAts.get(c.req.raw);
    const durationMs = startedAt === undefined ? undefined : getDurationMs(startedAt);

    if (error instanceof ApiError) {
      console.error(
        "[api] request_error",
        JSON.stringify({
          requestId,
          method: c.req.method,
          path: c.req.path,
          status: error.status,
          code: error.code,
          durationMs,
          details: error.details,
        }),
      );
      return jsonError(c, error.status, error.code, error.message, error.details);
    }

    console.error(
      "[api] request_error",
      JSON.stringify({
        requestId,
        method: c.req.method,
        path: c.req.path,
        status: 500,
        code: "INTERNAL_ERROR",
        durationMs,
        message: error instanceof Error ? error.message : String(error),
      }),
    );
    return jsonError(c, 500, "INTERNAL_ERROR", "Internal server error.");
  });

  return app;
};
