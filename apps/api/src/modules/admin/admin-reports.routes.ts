import { Hono } from "hono";
import { and, eq, gt, asc } from "drizzle-orm";
import type { DbClient } from "@agent/db";
import { matchReports } from "@agent/db";

import { ApiError } from "../../lib/api-error.js";
import { jsonOk } from "../../lib/http.js";
import { parseWithSchema } from "../../lib/validation.js";
import { listReportsQuerySchema } from "../../schemas/admin.js";

export const createAdminReportsRoutes = (db: DbClient) => {
  const routes = new Hono();

  // GET /reports — list reports with cursor-based pagination
  routes.get("/reports", async (c) => {
    const query = parseWithSchema(listReportsQuerySchema, c.req.query());
    const { cursor, limit, status } = query;

    const conditions = [];
    if (cursor) {
      conditions.push(gt(matchReports.id, cursor));
    }
    if (status) {
      conditions.push(eq(matchReports.status, status));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db
      .select()
      .from(matchReports)
      .where(where)
      .orderBy(asc(matchReports.id))
      .limit(limit + 1);

    const hasNextPage = rows.length > limit;
    const items = hasNextPage ? rows.slice(0, limit) : rows;
    const nextCursor = hasNextPage ? items[items.length - 1]!.id : null;

    return jsonOk(c, { items, nextCursor, hasNextPage });
  });

  // GET /reports/:reportId — get report detail
  routes.get("/reports/:reportId", async (c) => {
    const reportId = c.req.param("reportId");
    const [report] = await db
      .select()
      .from(matchReports)
      .where(eq(matchReports.id, reportId))
      .limit(1);

    if (!report) {
      throw new ApiError(
        404,
        "REPORT_NOT_FOUND",
        `Report not found: ${reportId}`,
      );
    }

    return jsonOk(c, report);
  });

  return routes;
};
