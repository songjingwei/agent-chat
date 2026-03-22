import { Hono } from "hono";

import { ApiError } from "../../lib/api-error.js";
import { jsonOk } from "../../lib/http.js";
import { parseJsonBody, parseWithSchema } from "../../lib/validation.js";
import { createSessionBodySchema, listSessionsQuerySchema } from "../../schemas/session.js";
import type { SessionService } from "../../services/session.service.js";

export const createSessionRoutes = (sessionService: SessionService) => {
  const routes = new Hono();

  routes.post("/sessions", async (c) => {
    const body = await parseJsonBody(c, createSessionBodySchema);
    const session = sessionService.create(body);
    return jsonOk(c, session, 201);
  });

  routes.get("/sessions", (c) => {
    const query = parseWithSchema(listSessionsQuerySchema, c.req.query());
    const items = sessionService.list({
      personaId: query.personaId,
      userId: query.userId,
    });

    return jsonOk(c, {
      items,
      total: items.length,
    });
  });

  routes.get("/sessions/:sessionId", (c) => {
    const sessionId = c.req.param("sessionId");
    const session = sessionService.getById(sessionId);

    if (!session) {
      throw new ApiError(404, "SESSION_NOT_FOUND", `Session not found: ${sessionId}`);
    }

    return jsonOk(c, session);
  });

  return routes;
};
