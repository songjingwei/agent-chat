import { Hono } from "hono";

import { jsonOk } from "../../lib/http";
import { parseJsonBody } from "../../lib/validation";
import { createHumanMessageBodySchema } from "../../schemas/message";
import type { MessageService } from "../../services/message.service";

export const createMessageRoutes = (messageService: MessageService) => {
  const routes = new Hono();

  routes.post("/sessions/:sessionId/human-message", async (c) => {
    const sessionId = c.req.param("sessionId");
    const body = await parseJsonBody(c, createHumanMessageBodySchema);
    const message = messageService.createHumanMessage({
      sessionId,
      authorPersonaId: body.authorPersonaId,
      content: body.content,
    });

    return jsonOk(c, message, 201);
  });

  routes.get("/sessions/:sessionId/messages", (c) => {
    const sessionId = c.req.param("sessionId");
    const items = messageService.listBySession(sessionId);

    return jsonOk(c, {
      items,
      total: items.length,
    });
  });

  return routes;
};
