import { Hono } from "hono";
import { eq } from "drizzle-orm";

import type { DbClient } from "@agent/db";
import { systemConfigs } from "@agent/db";
import { jsonOk } from "../../lib/http.js";

interface PresetTrait {
  zh: string;
  en: string;
}

/**
 * Public config routes — no auth required.
 * Exposes read-only config values for frontend consumption.
 */
export const createPublicConfigRoutes = (db: DbClient) => {
  const routes = new Hono();

  // GET /configs/persona-traits — preset trait tags for persona creation
  routes.get("/configs/persona-traits", async (c) => {
    const [row] = await db
      .select({ configValue: systemConfigs.configValue })
      .from(systemConfigs)
      .where(eq(systemConfigs.configKey, "persona.preset_traits"))
      .limit(1);

    if (!row) {
      return jsonOk(c, { traits: [] });
    }

    try {
      const traits = JSON.parse(row.configValue) as PresetTrait[];
      return jsonOk(c, { traits });
    } catch {
      return jsonOk(c, { traits: [] });
    }
  });

  return routes;
};
