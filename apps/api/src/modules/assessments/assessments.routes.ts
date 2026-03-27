import { Hono } from "hono";

import { jsonOk } from "../../lib/http.js";
import { parseJsonBody } from "../../lib/validation.js";
import {
  createAssessmentSessionBodySchema,
  submitAssessmentAnswerBodySchema,
} from "../../schemas/assessment.js";
import type { AssessmentService } from "../../services/assessment.service.js";

export const createAssessmentRoutes = (
  assessmentService: AssessmentService,
) => {
  const routes = new Hono();

  routes.post("/assessment-sessions", async (c) => {
    const body = await parseJsonBody(c, createAssessmentSessionBodySchema);
    const userId = c.get("userId");
    const session = await assessmentService.createSession({
      userId,
      personaId: body.personaId,
      templateSlug: body.templateSlug,
    });
    return jsonOk(c, session, 201);
  });

  routes.get("/assessment-sessions/:sessionId", async (c) => {
    const userId = c.get("userId");
    const sessionId = c.req.param("sessionId");
    const session = await assessmentService.getSession(userId, sessionId);
    return jsonOk(c, session);
  });

  routes.post("/assessment-sessions/:sessionId/answers", async (c) => {
    const userId = c.get("userId");
    const sessionId = c.req.param("sessionId");
    const body = await parseJsonBody(c, submitAssessmentAnswerBodySchema);
    const session = await assessmentService.submitAnswer({
      userId,
      sessionId,
      sessionItemId: body.sessionItemId,
      selectedOptionValue: body.selectedOptionValue,
      freeTextAnswer: body.freeTextAnswer,
    });
    return jsonOk(c, session, 201);
  });

  routes.get("/assessment-sessions/:sessionId/result", async (c) => {
    const userId = c.get("userId");
    const sessionId = c.req.param("sessionId");
    const result = await assessmentService.getResult(userId, sessionId);
    return jsonOk(c, result);
  });

  return routes;
};
