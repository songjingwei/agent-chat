import { Hono } from "hono";
import { and, eq, gt, inArray, asc } from "drizzle-orm";
import type { DbClient } from "@agent/db";
import { agentPersonas } from "@agent/db";

import { ApiError } from "../../lib/api-error.js";
import { jsonOk } from "../../lib/http.js";
import { parseJsonBody, parseWithSchema } from "../../lib/validation.js";
import {
  batchPersonasBodySchema,
  listPersonasQuerySchema,
  updatePersonaBodySchema,
} from "../../schemas/admin.js";

export const createAdminPersonasRoutes = (db: DbClient) => {
  const routes = new Hono();

  // GET /personas — list all personas with cursor-based pagination
  routes.get("/personas", async (c) => {
    const query = parseWithSchema(listPersonasQuerySchema, c.req.query());
    const { cursor, limit, status, userId } = query;

    const conditions = [];
    if (cursor) {
      conditions.push(gt(agentPersonas.id, cursor));
    }
    if (status) {
      conditions.push(eq(agentPersonas.status, status));
    }
    if (userId) {
      conditions.push(eq(agentPersonas.userId, userId));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db
      .select()
      .from(agentPersonas)
      .where(where)
      .orderBy(asc(agentPersonas.id))
      .limit(limit + 1);

    const hasNextPage = rows.length > limit;
    const items = hasNextPage ? rows.slice(0, limit) : rows;
    const nextCursor = hasNextPage ? items[items.length - 1]!.id : null;

    return jsonOk(c, { items, nextCursor, hasNextPage });
  });

  // POST /personas/batch — batch delete/restore/update status with partial success
  routes.post("/personas/batch", async (c) => {
    const body = await parseJsonBody(c, batchPersonasBodySchema);
    const adminId = c.get("adminId");
    const uniqueIds = Array.from(new Set(body.personaIds));
    const now = new Date();

    const existingRows = await db
      .select({
        id: agentPersonas.id,
        deletedAt: agentPersonas.deletedAt,
      })
      .from(agentPersonas)
      .where(inArray(agentPersonas.id, uniqueIds));
    const existingMap = new Map(existingRows.map((row) => [row.id, row]));

    const eligibleIds: string[] = [];
    const failedItems: Array<{ id: string; code: string; message: string }> = [];

    for (const id of uniqueIds) {
      const row = existingMap.get(id);
      if (!row) {
        failedItems.push({
          id,
          code: "PERSONA_NOT_FOUND",
          message: `Persona not found: ${id}`,
        });
        continue;
      }

      if (body.action === "delete" && row.deletedAt) {
        failedItems.push({
          id,
          code: "PERSONA_ALREADY_DELETED",
          message: "Persona is already deleted.",
        });
        continue;
      }

      if (body.action === "restore" && !row.deletedAt) {
        failedItems.push({
          id,
          code: "PERSONA_NOT_DELETED",
          message: "Persona is not deleted.",
        });
        continue;
      }

      if (body.action === "update_status" && row.deletedAt) {
        failedItems.push({
          id,
          code: "PERSONA_DELETED",
          message: "Cannot update status of a deleted persona.",
        });
        continue;
      }

      eligibleIds.push(id);
    }

    let succeededIds: string[] = [];
    if (eligibleIds.length > 0) {
      if (body.action === "delete") {
        const updatedRows = await db
          .update(agentPersonas)
          .set({
            deletedAt: now,
            updatedBy: adminId,
            updatedAt: now,
          })
          .where(inArray(agentPersonas.id, eligibleIds))
          .returning({ id: agentPersonas.id });
        succeededIds = updatedRows.map((row) => row.id);
      } else if (body.action === "restore") {
        const updatedRows = await db
          .update(agentPersonas)
          .set({
            deletedAt: null,
            updatedBy: adminId,
            updatedAt: now,
          })
          .where(inArray(agentPersonas.id, eligibleIds))
          .returning({ id: agentPersonas.id });
        succeededIds = updatedRows.map((row) => row.id);
      } else {
        const status = (
          body as {
            action: "update_status";
            status: "draft" | "active" | "archived";
          }
        ).status;
        const updatedRows = await db
          .update(agentPersonas)
          .set({
            status,
            updatedBy: adminId,
            updatedAt: now,
          })
          .where(inArray(agentPersonas.id, eligibleIds))
          .returning({ id: agentPersonas.id });
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

  // GET /personas/:personaId — get persona detail
  routes.get("/personas/:personaId", async (c) => {
    const personaId = c.req.param("personaId");
    const [persona] = await db
      .select()
      .from(agentPersonas)
      .where(eq(agentPersonas.id, personaId))
      .limit(1);

    if (!persona) {
      throw new ApiError(
        404,
        "PERSONA_NOT_FOUND",
        `Persona not found: ${personaId}`,
      );
    }

    return jsonOk(c, persona);
  });

  // PATCH /personas/:personaId — update persona fields
  routes.patch("/personas/:personaId", async (c) => {
    const personaId = c.req.param("personaId");
    const body = await parseJsonBody(c, updatePersonaBodySchema);
    const adminId = c.get("adminId");

    const [existing] = await db
      .select({ id: agentPersonas.id })
      .from(agentPersonas)
      .where(eq(agentPersonas.id, personaId))
      .limit(1);

    if (!existing) {
      throw new ApiError(
        404,
        "PERSONA_NOT_FOUND",
        `Persona not found: ${personaId}`,
      );
    }

    const [updated] = await db
      .update(agentPersonas)
      .set({
        ...body,
        updatedBy: adminId,
        updatedAt: new Date(),
      })
      .where(eq(agentPersonas.id, personaId))
      .returning();

    return jsonOk(c, updated);
  });

  // DELETE /personas/:personaId — soft-delete
  routes.delete("/personas/:personaId", async (c) => {
    const personaId = c.req.param("personaId");
    const adminId = c.get("adminId");

    const [existing] = await db
      .select({ id: agentPersonas.id, deletedAt: agentPersonas.deletedAt })
      .from(agentPersonas)
      .where(eq(agentPersonas.id, personaId))
      .limit(1);

    if (!existing) {
      throw new ApiError(
        404,
        "PERSONA_NOT_FOUND",
        `Persona not found: ${personaId}`,
      );
    }

    if (existing.deletedAt) {
      throw new ApiError(
        400,
        "PERSONA_ALREADY_DELETED",
        "Persona is already deleted.",
      );
    }

    const [deleted] = await db
      .update(agentPersonas)
      .set({
        deletedAt: new Date(),
        updatedBy: adminId,
        updatedAt: new Date(),
      })
      .where(eq(agentPersonas.id, personaId))
      .returning();

    return jsonOk(c, deleted);
  });

  // POST /personas/:personaId/restore — restore soft-deleted persona
  routes.post("/personas/:personaId/restore", async (c) => {
    const personaId = c.req.param("personaId");
    const adminId = c.get("adminId");

    const [existing] = await db
      .select({ id: agentPersonas.id, deletedAt: agentPersonas.deletedAt })
      .from(agentPersonas)
      .where(eq(agentPersonas.id, personaId))
      .limit(1);

    if (!existing) {
      throw new ApiError(
        404,
        "PERSONA_NOT_FOUND",
        `Persona not found: ${personaId}`,
      );
    }

    if (!existing.deletedAt) {
      throw new ApiError(
        400,
        "PERSONA_NOT_DELETED",
        "Persona is not deleted.",
      );
    }

    const [restored] = await db
      .update(agentPersonas)
      .set({
        deletedAt: null,
        updatedBy: adminId,
        updatedAt: new Date(),
      })
      .where(eq(agentPersonas.id, personaId))
      .returning();

    return jsonOk(c, restored);
  });

  return routes;
};
