import { Hono } from "hono";

import { ApiError } from "../../lib/api-error.js";
import { jsonOk } from "../../lib/http.js";
import { parseWithSchema } from "../../lib/validation.js";
import { latestReportQuerySchema } from "../../schemas/message.js";
import type { ReportService } from "../../services/report.service.js";

export const createReportRoutes = (reportService: ReportService) => {
  const routes = new Hono();

  routes.get("/reports/latest", (c) => {
    const query = parseWithSchema(latestReportQuerySchema, c.req.query());
    const report = reportService.getLatestByPersona(query.personaId);

    if (!report) {
      throw new ApiError(404, "REPORT_NOT_FOUND", `No report found for persona: ${query.personaId}`);
    }

    return jsonOk(c, report);
  });

  return routes;
};
