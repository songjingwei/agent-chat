import { Hono } from "hono";
import { and, eq, gt, lt, inArray, or, asc, desc } from "drizzle-orm";
import type { DbClient } from "@agent/db";
import { matchReports } from "@agent/db";

import { ApiError } from "../../lib/api-error.js";
import { jsonOk } from "../../lib/http.js";
import { parseJsonBody, parseWithSchema } from "../../lib/validation.js";
import { batchReportsBodySchema, listReportsQuerySchema } from "../../schemas/admin.js";

export const createAdminReportsRoutes = (db: DbClient) => {
  const routes = new Hono();

  // GET /reports — list reports with cursor-based pagination
  routes.get("/reports", async (c) => {
    const query = parseWithSchema(listReportsQuerySchema, c.req.query());
    const { cursor, limit, status, sortBy, sortOrder } = query;
    const timeColumn =
      sortBy === "updatedAt" ? matchReports.updatedAt : matchReports.createdAt;

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
                and(eq(timeColumn, cursorTime), lt(matchReports.id, cursorId)),
              )
            : or(
                gt(timeColumn, cursorTime),
                and(eq(timeColumn, cursorTime), gt(matchReports.id, cursorId)),
              ),
        );
      }
    }
    if (status) {
      conditions.push(eq(matchReports.status, status));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db
      .select()
      .from(matchReports)
      .where(where)
      .orderBy(
        sortOrder === "desc" ? desc(timeColumn) : asc(timeColumn),
        sortOrder === "desc" ? desc(matchReports.id) : asc(matchReports.id),
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

  // DELETE /reports/:reportId — hard-delete report
  routes.delete("/reports/:reportId", async (c) => {
    const reportId = c.req.param("reportId");

    const [existing] = await db
      .select({ id: matchReports.id })
      .from(matchReports)
      .where(eq(matchReports.id, reportId))
      .limit(1);

    if (!existing) {
      throw new ApiError(
        404,
        "REPORT_NOT_FOUND",
        `Report not found: ${reportId}`,
      );
    }

    await db.delete(matchReports).where(eq(matchReports.id, reportId));
    return jsonOk(c, { deleted: true });
  });

  // POST /reports/batch — batch delete reports with partial success
  routes.post("/reports/batch", async (c) => {
    const body = await parseJsonBody(c, batchReportsBodySchema);
    const uniqueIds = Array.from(new Set(body.reportIds));

    const existingRows = await db
      .select({ id: matchReports.id })
      .from(matchReports)
      .where(inArray(matchReports.id, uniqueIds));
    const existingIdSet = new Set(existingRows.map((row) => row.id));

    const eligibleIds: string[] = [];
    const failedItems: Array<{ id: string; code: string; message: string }> = [];

    for (const id of uniqueIds) {
      if (!existingIdSet.has(id)) {
        failedItems.push({
          id,
          code: "REPORT_NOT_FOUND",
          message: `Report not found: ${id}`,
        });
        continue;
      }
      eligibleIds.push(id);
    }

    let succeededIds: string[] = [];
    if (eligibleIds.length > 0) {
      const deletedRows = await db
        .delete(matchReports)
        .where(inArray(matchReports.id, eligibleIds))
        .returning({ id: matchReports.id });
      succeededIds = deletedRows.map((row) => row.id);
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

  return routes;
};
