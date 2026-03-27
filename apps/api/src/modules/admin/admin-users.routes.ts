import { Hono } from "hono";
import {
  and,
  eq,
  gt,
  lt,
  inArray,
  ilike,
  or,
  asc,
  desc,
} from "drizzle-orm";
import type { DbClient } from "@agent/db";
import { users } from "@agent/db";

import { ApiError } from "../../lib/api-error.js";
import { jsonOk } from "../../lib/http.js";
import { parseJsonBody, parseWithSchema } from "../../lib/validation.js";
import {
  batchUsersBodySchema,
  listUsersQuerySchema,
  updateUserBodySchema,
} from "../../schemas/admin.js";

export const createAdminUsersRoutes = (db: DbClient) => {
  const routes = new Hono();

  // GET /users — list users with cursor-based pagination
  routes.get("/users", async (c) => {
    const query = parseWithSchema(listUsersQuerySchema, c.req.query());
    const { cursor, limit, search, sortBy, sortOrder } = query;
    const timeColumn = sortBy === "updatedAt" ? users.updatedAt : users.createdAt;

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
                and(eq(timeColumn, cursorTime), lt(users.id, cursorId)),
              )
            : or(
                gt(timeColumn, cursorTime),
                and(eq(timeColumn, cursorTime), gt(users.id, cursorId)),
              ),
        );
      }
    }
    if (search) {
      conditions.push(
        or(
          ilike(users.email, `%${search}%`),
          ilike(users.displayName, `%${search}%`),
        ),
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db
      .select({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        deletedAt: users.deletedAt,
      })
      .from(users)
      .where(where)
      .orderBy(
        sortOrder === "desc" ? desc(timeColumn) : asc(timeColumn),
        sortOrder === "desc" ? desc(users.id) : asc(users.id),
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

    return jsonOk(c, { items, nextCursor, hasNextPage });
  });

  // POST /users/batch — batch delete/restore users with partial success
  routes.post("/users/batch", async (c) => {
    const body = await parseJsonBody(c, batchUsersBodySchema);
    const uniqueIds = Array.from(new Set(body.userIds));
    const now = new Date();

    const existingRows = await db
      .select({ id: users.id, deletedAt: users.deletedAt })
      .from(users)
      .where(inArray(users.id, uniqueIds));
    const existingMap = new Map(existingRows.map((row) => [row.id, row]));

    const eligibleIds: string[] = [];
    const failedItems: Array<{ id: string; code: string; message: string }> = [];

    for (const id of uniqueIds) {
      const row = existingMap.get(id);
      if (!row) {
        failedItems.push({
          id,
          code: "USER_NOT_FOUND",
          message: `User not found: ${id}`,
        });
        continue;
      }

      if (body.action === "delete" && row.deletedAt) {
        failedItems.push({
          id,
          code: "USER_ALREADY_DELETED",
          message: "User is already deleted.",
        });
        continue;
      }

      if (body.action === "restore" && !row.deletedAt) {
        failedItems.push({
          id,
          code: "USER_NOT_DELETED",
          message: "User is not deleted.",
        });
        continue;
      }

      eligibleIds.push(id);
    }

    let succeededIds: string[] = [];
    if (eligibleIds.length > 0) {
      const updatedRows = await db
        .update(users)
        .set({
          deletedAt: body.action === "delete" ? now : null,
          updatedAt: now,
        })
        .where(inArray(users.id, eligibleIds))
        .returning({ id: users.id });
      succeededIds = updatedRows.map((row) => row.id);
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

  // GET /users/:userId — get user detail
  routes.get("/users/:userId", async (c) => {
    const userId = c.req.param("userId");
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new ApiError(404, "USER_NOT_FOUND", `User not found: ${userId}`);
    }

    const { passwordHash: _, ...safeUser } = user;
    return jsonOk(c, safeUser);
  });

  // PATCH /users/:userId — update user
  routes.patch("/users/:userId", async (c) => {
    const userId = c.req.param("userId");
    const body = await parseJsonBody(c, updateUserBodySchema);

    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!existing) {
      throw new ApiError(404, "USER_NOT_FOUND", `User not found: ${userId}`);
    }

    const [updated] = await db
      .update(users)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    const { passwordHash: _, ...safeUser } = updated!;
    return jsonOk(c, safeUser);
  });

  // DELETE /users/:userId — soft-delete
  routes.delete("/users/:userId", async (c) => {
    const userId = c.req.param("userId");

    const [existing] = await db
      .select({ id: users.id, deletedAt: users.deletedAt })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!existing) {
      throw new ApiError(404, "USER_NOT_FOUND", `User not found: ${userId}`);
    }

    if (existing.deletedAt) {
      throw new ApiError(400, "USER_ALREADY_DELETED", "User is already deleted.");
    }

    const [deleted] = await db
      .update(users)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();

    const { passwordHash: _, ...safeUser } = deleted!;
    return jsonOk(c, safeUser);
  });

  // POST /users/:userId/restore — unset deleted_at
  routes.post("/users/:userId/restore", async (c) => {
    const userId = c.req.param("userId");

    const [existing] = await db
      .select({ id: users.id, deletedAt: users.deletedAt })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!existing) {
      throw new ApiError(404, "USER_NOT_FOUND", `User not found: ${userId}`);
    }

    if (!existing.deletedAt) {
      throw new ApiError(400, "USER_NOT_DELETED", "User is not deleted.");
    }

    const [restored] = await db
      .update(users)
      .set({ deletedAt: null, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();

    const { passwordHash: _, ...safeUser } = restored!;
    return jsonOk(c, safeUser);
  });

  return routes;
};
