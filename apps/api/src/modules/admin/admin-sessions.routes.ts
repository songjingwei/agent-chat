import { Hono } from "hono";
import { and, eq, gt, lt, inArray, or, asc, desc } from "drizzle-orm";
import type { DbClient } from "@agent/db";
import { agentPersonas, chatSessions } from "@agent/db";

import { ApiError } from "../../lib/api-error.js";
import { jsonOk } from "../../lib/http.js";
import { parseJsonBody, parseWithSchema } from "../../lib/validation.js";
import {
  batchSessionsBodySchema,
  listSessionsQuerySchema,
  updateSessionBodySchema,
} from "../../schemas/admin.js";

export const createAdminSessionsRoutes = (db: DbClient) => {
  const routes = new Hono();

  const attachPersonaNames = async (
    sessions: Array<typeof chatSessions.$inferSelect>,
  ) => {
    if (sessions.length === 0) {
      return sessions;
    }

    const personaIds = Array.from(
      new Set(
        sessions.flatMap((session) => [
          session.initiatorPersonaId,
          session.targetPersonaId,
        ]),
      ),
    );

    const personaRows =
      personaIds.length === 0
        ? []
        : await db
            .select({
              id: agentPersonas.id,
              name: agentPersonas.name,
            })
            .from(agentPersonas)
            .where(inArray(agentPersonas.id, personaIds));
    const personaMap = new Map(personaRows.map((row) => [row.id, row]));

    return sessions.map((session) => ({
      ...session,
      initiatorPersona:
        personaMap.get(session.initiatorPersonaId) ?? undefined,
      targetPersona: personaMap.get(session.targetPersonaId) ?? undefined,
    }));
  };

  // GET /sessions — list sessions with cursor-based pagination
  routes.get("/sessions", async (c) => {
    const query = parseWithSchema(listSessionsQuerySchema, c.req.query());
    const { cursor, limit, status, sortBy, sortOrder } = query;
    const timeColumn =
      sortBy === "updatedAt" ? chatSessions.updatedAt : chatSessions.createdAt;

    const conditions = [];
    if (cursor) {
      const [cursorTimeText, cursorId] = cursor.split("|");
      const cursorTime = cursorTimeText ? new Date(cursorTimeText) : null;
      if (
        cursorId &&
        cursorTime &&
        !Number.isNaN(cursorTime.getTime())
      ) {
        conditions.push(
          sortOrder === "desc"
            ? or(
                lt(timeColumn, cursorTime),
                and(eq(timeColumn, cursorTime), lt(chatSessions.id, cursorId)),
              )
            : or(
                gt(timeColumn, cursorTime),
                and(eq(timeColumn, cursorTime), gt(chatSessions.id, cursorId)),
              ),
        );
      }
    }
    if (status) {
      conditions.push(eq(chatSessions.status, status));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db
      .select()
      .from(chatSessions)
      .where(where)
      .orderBy(
        sortOrder === "desc" ? desc(timeColumn) : asc(timeColumn),
        sortOrder === "desc" ? desc(chatSessions.id) : asc(chatSessions.id),
      )
      .limit(limit + 1);

    const hasNextPage = rows.length > limit;
    const items = hasNextPage ? rows.slice(0, limit) : rows;
    const nextCursor = hasNextPage
      ? `${(
          sortBy === "updatedAt"
            ? items[items.length - 1]!.updatedAt
            : items[items.length - 1]!.createdAt
        ).toISOString()}|${items[items.length - 1]!.id}`
      : null;
    const itemsWithPersonas = await attachPersonaNames(items);

    return jsonOk(c, { items: itemsWithPersonas, nextCursor, hasNextPage });
  });

  // POST /sessions/batch — batch delete/update status with partial success
  routes.post("/sessions/batch", async (c) => {
    const body = await parseJsonBody(c, batchSessionsBodySchema);
    const adminId = c.get("adminId");
    const uniqueIds = Array.from(new Set(body.sessionIds));
    const now = new Date();

    const existingRows = await db
      .select({
        id: chatSessions.id,
        deletedAt: chatSessions.deletedAt,
      })
      .from(chatSessions)
      .where(inArray(chatSessions.id, uniqueIds));
    const existingMap = new Map(existingRows.map((row) => [row.id, row]));

    const eligibleIds: string[] = [];
    const failedItems: Array<{ id: string; code: string; message: string }> = [];

    for (const id of uniqueIds) {
      const row = existingMap.get(id);
      if (!row) {
        failedItems.push({
          id,
          code: "SESSION_NOT_FOUND",
          message: `Session not found: ${id}`,
        });
        continue;
      }

      if (body.action === "delete" && row.deletedAt) {
        failedItems.push({
          id,
          code: "SESSION_ALREADY_DELETED",
          message: "Session is already deleted.",
        });
        continue;
      }

      if (body.action === "update_status" && row.deletedAt) {
        failedItems.push({
          id,
          code: "SESSION_DELETED",
          message: "Cannot update status of a deleted session.",
        });
        continue;
      }

      eligibleIds.push(id);
    }

    let succeededIds: string[] = [];
    if (eligibleIds.length > 0) {
      if (body.action === "delete") {
        const updatedRows = await db
          .update(chatSessions)
          .set({
            deletedAt: now,
            updatedBy: adminId,
            updatedAt: now,
          })
          .where(inArray(chatSessions.id, eligibleIds))
          .returning({ id: chatSessions.id });
        succeededIds = updatedRows.map((row) => row.id);
      } else {
        const updatedRows = await db
          .update(chatSessions)
          .set({
            status: body.status,
            updatedBy: adminId,
            updatedAt: now,
          })
          .where(inArray(chatSessions.id, eligibleIds))
          .returning({ id: chatSessions.id });
        succeededIds = updatedRows.map((row) => row.id);
      }
    }

    return jsonOk(c, {
      action: body.action,
      requestedCount: uniqueIds.length,
      succeededCount: succeededIds.length,
      failedCount: failedItems.length,
      succeededIds,
      failedItems,
    });
  });

  // GET /sessions/:sessionId — get session detail
  routes.get("/sessions/:sessionId", async (c) => {
    const sessionId = c.req.param("sessionId");
    const [session] = await db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.id, sessionId))
      .limit(1);

    if (!session) {
      throw new ApiError(
        404,
        "SESSION_NOT_FOUND",
        `Session not found: ${sessionId}`,
      );
    }

    const [sessionWithPersonas] = await attachPersonaNames([session]);
    return jsonOk(c, sessionWithPersonas);
  });

  // PATCH /sessions/:sessionId — update status only
  routes.patch("/sessions/:sessionId", async (c) => {
    const sessionId = c.req.param("sessionId");
    const body = await parseJsonBody(c, updateSessionBodySchema);
    const adminId = c.get("adminId");

    const [existing] = await db
      .select({ id: chatSessions.id })
      .from(chatSessions)
      .where(eq(chatSessions.id, sessionId))
      .limit(1);

    if (!existing) {
      throw new ApiError(
        404,
        "SESSION_NOT_FOUND",
        `Session not found: ${sessionId}`,
      );
    }

    const [updated] = await db
      .update(chatSessions)
      .set({
        status: body.status,
        updatedBy: adminId,
        updatedAt: new Date(),
      })
      .where(eq(chatSessions.id, sessionId))
      .returning();

    return jsonOk(c, updated);
  });

  // DELETE /sessions/:sessionId — soft-delete
  routes.delete("/sessions/:sessionId", async (c) => {
    const sessionId = c.req.param("sessionId");
    const adminId = c.get("adminId");

    const [existing] = await db
      .select({ id: chatSessions.id, deletedAt: chatSessions.deletedAt })
      .from(chatSessions)
      .where(eq(chatSessions.id, sessionId))
      .limit(1);

    if (!existing) {
      throw new ApiError(
        404,
        "SESSION_NOT_FOUND",
        `Session not found: ${sessionId}`,
      );
    }

    if (existing.deletedAt) {
      throw new ApiError(
        400,
        "SESSION_ALREADY_DELETED",
        "Session is already deleted.",
      );
    }

    const [deleted] = await db
      .update(chatSessions)
      .set({
        deletedAt: new Date(),
        updatedBy: adminId,
        updatedAt: new Date(),
      })
      .where(eq(chatSessions.id, sessionId))
      .returning();

    return jsonOk(c, deleted);
  });

  return routes;
};
