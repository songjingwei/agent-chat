import { Hono } from "hono";

import { ApiError } from "../../lib/api-error.js";
import { jsonOk } from "../../lib/http.js";
import { parseJsonBody, parseWithSchema } from "../../lib/validation.js";
import { createSessionBodySchema, listSessionsQuerySchema } from "../../schemas/session.js";
import type { ConversationOrchestrator } from "../../services/conversation-orchestrator.service.js";
import type { SessionService } from "../../services/session.service.js";

interface CreateSessionRoutesDeps {
  sessionService: SessionService;
  conversationOrchestrator: ConversationOrchestrator;
}

export const createSessionRoutes = ({
  sessionService,
  conversationOrchestrator,
}: CreateSessionRoutesDeps) => {
  const routes = new Hono();

  routes.post("/sessions", async (c) => {
    const body = await parseJsonBody(c, createSessionBodySchema);
    const session = await sessionService.create(body);
    conversationOrchestrator.enqueueAdvance({
      sessionId: session.id,
      trigger: "session_created",
      requestedSpeakerPersonaId: session.initiatorPersonaId,
    });
    return jsonOk(c, session, 201);
  });

  routes.get("/sessions", async (c) => {
    const query = parseWithSchema(listSessionsQuerySchema, c.req.query());
    const userId = c.get("userId");
    const items = await sessionService.list({
      personaId: query.personaId,
      userId,
    });

    return jsonOk(c, {
      items,
      total: items.length,
    });
  });

  routes.get("/sessions/:sessionId", async (c) => {
    const sessionId = c.req.param("sessionId");
    const session = await sessionService.getById(sessionId);

    if (!session) {
      throw new ApiError(404, "SESSION_NOT_FOUND", `Session not found: ${sessionId}`);
    }

    return jsonOk(c, session);
  });

  routes.post("/sessions/:sessionId/force-end", async (c) => {
    const sessionId = c.req.param("sessionId");
    const session = await sessionService.getById(sessionId);
    if (!session) {
      throw new ApiError(404, "SESSION_NOT_FOUND", `Session not found: ${sessionId}`);
    }

    conversationOrchestrator.cancelSession(sessionId);
    const ended = await sessionService.updateStatus(sessionId, "completed");
    return jsonOk(c, ended);
  });

  return routes;
};
