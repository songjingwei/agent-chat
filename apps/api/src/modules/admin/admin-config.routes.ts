import { Hono } from "hono";
import { eq } from "drizzle-orm";
import type { DbClient } from "@agent/db";
import { systemConfigs } from "@agent/db";

import { createId } from "../../lib/id.js";
import { ApiError } from "../../lib/api-error.js";
import { jsonOk } from "../../lib/http.js";
import { parseJsonBody } from "../../lib/validation.js";
import { upsertConfigBodySchema } from "../../schemas/admin.js";

export const createAdminConfigRoutes = (db: DbClient) => {
  const routes = new Hono();

  // GET /configs — list all config entries (mask is_secret values)
  routes.get("/configs", async (c) => {
    const rows = await db.select().from(systemConfigs);

    const items = rows.map((row) => ({
      ...row,
      configValue: row.isSecret ? "********" : row.configValue,
    }));

    return jsonOk(c, { items });
  });

  // PUT /configs/:key — upsert config value
  routes.put("/configs/:key", async (c) => {
    const configKey = c.req.param("key");
    const body = await parseJsonBody(c, upsertConfigBodySchema);
    const adminId = c.get("adminId");

    const [existing] = await db
      .select({ id: systemConfigs.id })
      .from(systemConfigs)
      .where(eq(systemConfigs.configKey, configKey))
      .limit(1);

    if (existing) {
      // Update
      const [updated] = await db
        .update(systemConfigs)
        .set({
          configValue: body.configValue,
          valueType: body.valueType,
          description: body.description,
          isSecret: body.isSecret,
          updatedBy: adminId,
          updatedAt: new Date(),
        })
        .where(eq(systemConfigs.configKey, configKey))
        .returning();

      const result = {
        ...updated!,
        configValue: updated!.isSecret ? "********" : updated!.configValue,
      };

      return jsonOk(c, result);
    }

    // Insert
    const [created] = await db
      .insert(systemConfigs)
      .values({
        id: createId("cfg"),
        configKey,
        configValue: body.configValue,
        valueType: body.valueType,
        description: body.description,
        isSecret: body.isSecret ?? false,
        createdBy: adminId,
        updatedBy: adminId,
      })
      .returning();

    const result = {
      ...created!,
      configValue: created!.isSecret ? "********" : created!.configValue,
    };

    return jsonOk(c, result, 201);
  });

  // DELETE /configs/:key — delete config entry
  routes.delete("/configs/:key", async (c) => {
    const configKey = c.req.param("key");

    const [existing] = await db
      .select({ id: systemConfigs.id })
      .from(systemConfigs)
      .where(eq(systemConfigs.configKey, configKey))
      .limit(1);

    if (!existing) {
      throw new ApiError(
        404,
        "CONFIG_NOT_FOUND",
        `Config not found: ${configKey}`,
      );
    }

    await db
      .delete(systemConfigs)
      .where(eq(systemConfigs.configKey, configKey));

    return jsonOk(c, { deleted: true });
  });

  return routes;
};
