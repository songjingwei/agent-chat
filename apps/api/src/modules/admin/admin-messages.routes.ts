import { Hono } from "hono";
import { and, eq, gt, asc, inArray } from "drizzle-orm";
import type { DbClient } from "@agent/db";
import { agentPersonas, chatMessages } from "@agent/db";

import { ApiError } from "../../lib/api-error.js";
import { jsonOk } from "../../lib/http.js";
import { parseWithSchema } from "../../lib/validation.js";
import { listMessagesQuerySchema } from "../../schemas/admin.js";

export const createAdminMessagesRoutes = (db: DbClient) => {
  const routes = new Hono();

  const attachSenderPersonaNames = async (
    messages: Array<typeof chatMessages.$inferSelect>,
  ) => {
    if (messages.length === 0) {
      return messages;
    }

    const senderIds = Array.from(
      new Set(messages.map((message) => message.senderPersonaId)),
    );
    const personaRows = await db
      .select({
        id: agentPersonas.id,
        name: agentPersonas.name,
      })
      .from(agentPersonas)
      .where(inArray(agentPersonas.id, senderIds));
    const personaMap = new Map(personaRows.map((row) => [row.id, row]));

    return messages.map((message) => ({
      ...message,
      senderPersona: personaMap.get(message.senderPersonaId) ?? undefined,
    }));
  };

  // GET /sessions/:sessionId/messages — list messages for a session
  routes.get("/sessions/:sessionId/messages", async (c) => {
    const sessionId = c.req.param("sessionId");
    const query = parseWithSchema(listMessagesQuerySchema, c.req.query());
    const { cursor, limit } = query;

    const conditions = [eq(chatMessages.sessionId, sessionId)];
    if (cursor) {
      conditions.push(gt(chatMessages.id, cursor));
    }

    const rows = await db
      .select()
      .from(chatMessages)
      .where(and(...conditions))
      .orderBy(asc(chatMessages.id))
      .limit(limit + 1);

    const hasNextPage = rows.length > limit;
    const items = hasNextPage ? rows.slice(0, limit) : rows;
    const nextCursor = hasNextPage ? items[items.length - 1]!.id : null;
    const itemsWithPersonas = await attachSenderPersonaNames(items);

    return jsonOk(c, { items: itemsWithPersonas, nextCursor, hasNextPage });
  });

  // DELETE /messages/:messageId — hard delete a message
  routes.delete("/messages/:messageId", async (c) => {
    const messageId = c.req.param("messageId");

    const [existing] = await db
      .select({ id: chatMessages.id })
      .from(chatMessages)
      .where(eq(chatMessages.id, messageId))
      .limit(1);

    if (!existing) {
      throw new ApiError(
        404,
        "MESSAGE_NOT_FOUND",
        `Message not found: ${messageId}`,
      );
    }

    await db.delete(chatMessages).where(eq(chatMessages.id, messageId));

    return jsonOk(c, { deleted: true });
  });

  return routes;
};
