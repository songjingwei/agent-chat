import { Hono } from "hono";
import { and, eq, gt, inArray, asc } from "drizzle-orm";
import type { DbClient } from "@agent/db";
import { memoryItems } from "@agent/db";

import { ApiError } from "../../lib/api-error.js";
import { jsonOk } from "../../lib/http.js";
import { parseJsonBody, parseWithSchema } from "../../lib/validation.js";
import {
  batchMemoryItemsBodySchema,
  listMemoryItemsQuerySchema,
  updateMemoryItemBodySchema,
} from "../../schemas/admin.js";

export const createAdminMemoryRoutes = (db: DbClient) => {
  const routes = new Hono();

  // GET /memory-items — list memory items with cursor-based pagination
  routes.get("/memory-items", async (c) => {
    const query = parseWithSchema(listMemoryItemsQuerySchema, c.req.query());
    const { cursor, limit, personaId, category, source } = query;

    const conditions = [];
    if (cursor) {
      conditions.push(gt(memoryItems.id, cursor));
    }
    if (personaId) {
      conditions.push(eq(memoryItems.personaId, personaId));
    }
    if (category) {
      conditions.push(eq(memoryItems.category, category));
    }
    if (source) {
      conditions.push(eq(memoryItems.source, source));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db
      .select()
      .from(memoryItems)
      .where(where)
      .orderBy(asc(memoryItems.id))
      .limit(limit + 1);

    const hasNextPage = rows.length > limit;
    const items = hasNextPage ? rows.slice(0, limit) : rows;
    const nextCursor = hasNextPage ? items[items.length - 1]!.id : null;

    return jsonOk(c, { items, nextCursor, hasNextPage });
  });

  // POST /memory-items/batch — batch delete/update with partial success
  routes.post("/memory-items/batch", async (c) => {
    const body = await parseJsonBody(c, batchMemoryItemsBodySchema);
    const uniqueIds = Array.from(new Set(body.memoryIds));
    const now = new Date();

    const existingRows = await db
      .select({ id: memoryItems.id })
      .from(memoryItems)
      .where(inArray(memoryItems.id, uniqueIds));
    const existingIdSet = new Set(existingRows.map((row) => row.id));

    const eligibleIds: string[] = [];
    const failedItems: Array<{ id: string; code: string; message: string }> = [];

    for (const id of uniqueIds) {
      if (!existingIdSet.has(id)) {
        failedItems.push({
          id,
          code: "MEMORY_ITEM_NOT_FOUND",
          message: `Memory item not found: ${id}`,
        });
        continue;
      }
      eligibleIds.push(id);
    }

    let succeededIds: string[] = [];
    if (eligibleIds.length > 0) {
      if (body.action === "delete") {
        const deletedRows = await db
          .delete(memoryItems)
          .where(inArray(memoryItems.id, eligibleIds))
          .returning({ id: memoryItems.id });
        succeededIds = deletedRows.map((row) => row.id);
      } else {
        const setValues = {
          ...(body.content !== undefined ? { content: body.content } : {}),
          ...(body.weight !== undefined ? { weight: body.weight } : {}),
          ...(body.category !== undefined ? { category: body.category } : {}),
          updatedAt: now,
        };
        const updatedRows = await db
          .update(memoryItems)
          .set(setValues)
          .where(inArray(memoryItems.id, eligibleIds))
          .returning({ id: memoryItems.id });
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

  // PATCH /memory-items/:memoryId — update weight, content, category
  routes.patch("/memory-items/:memoryId", async (c) => {
    const memoryId = c.req.param("memoryId");
    const body = await parseJsonBody(c, updateMemoryItemBodySchema);

    const [existing] = await db
      .select({ id: memoryItems.id })
      .from(memoryItems)
      .where(eq(memoryItems.id, memoryId))
      .limit(1);

    if (!existing) {
      throw new ApiError(
        404,
        "MEMORY_ITEM_NOT_FOUND",
        `Memory item not found: ${memoryId}`,
      );
    }

    const [updated] = await db
      .update(memoryItems)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(eq(memoryItems.id, memoryId))
      .returning();

    return jsonOk(c, updated);
  });

  // DELETE /memory-items/:memoryId — hard delete
  routes.delete("/memory-items/:memoryId", async (c) => {
    const memoryId = c.req.param("memoryId");

    const [existing] = await db
      .select({ id: memoryItems.id })
      .from(memoryItems)
      .where(eq(memoryItems.id, memoryId))
      .limit(1);

    if (!existing) {
      throw new ApiError(
        404,
        "MEMORY_ITEM_NOT_FOUND",
        `Memory item not found: ${memoryId}`,
      );
    }

    await db.delete(memoryItems).where(eq(memoryItems.id, memoryId));

    return jsonOk(c, { deleted: true });
  });

  return routes;
};
