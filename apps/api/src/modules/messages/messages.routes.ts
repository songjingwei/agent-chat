import { Hono } from "hono";

import { jsonOk } from "../../lib/http.js";
import { parseJsonBody, parseWithSchema } from "../../lib/validation.js";
import {
  createHumanMessageBodySchema,
  listMessagesQuerySchema,
} from "../../schemas/message.js";
import type { ConversationOrchestrator } from "../../services/conversation-orchestrator.service.js";
import type { MessageService } from "../../services/message.service.js";

interface CreateMessageRoutesDeps {
  messageService: MessageService;
  conversationOrchestrator: ConversationOrchestrator;
}

export const createMessageRoutes = ({
  messageService,
  conversationOrchestrator,
}: CreateMessageRoutesDeps) => {
  const routes = new Hono();

  routes.post("/sessions/:sessionId/human-message", async (c) => {
    const sessionId = c.req.param("sessionId");
    const body = await parseJsonBody(c, createHumanMessageBodySchema);
    const message = await messageService.createHumanMessage({
      sessionId,
      authorPersonaId: body.authorPersonaId,
      content: body.content,
    });

    conversationOrchestrator.enqueueAdvance({
      sessionId,
      trigger: "human_message",
    });

    return jsonOk(c, message, 201);
  });

  routes.get("/sessions/:sessionId/messages", async (c) => {
    const sessionId = c.req.param("sessionId");
    const query = parseWithSchema(listMessagesQuerySchema, c.req.query());
    const useWindow =
      query.cursor !== undefined ||
      query.limit !== undefined ||
      query.scope !== undefined;

    if (!useWindow) {
      const items = await messageService.listBySession(sessionId);
      return jsonOk(c, {
        items,
        total: items.length,
        nextCursor: null,
      });
    }

    const result = await messageService.listBySessionWindow({
      sessionId,
      cursor: query.cursor,
      limit: query.limit,
      scope: query.scope,
    });

    return jsonOk(c, result);
  });

  return routes;
};
