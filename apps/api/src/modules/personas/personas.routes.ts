import { Hono } from "hono";

import { ApiError } from "../../lib/api-error.js";
import { jsonOk } from "../../lib/http.js";
import { parseJsonBody, parseWithSchema } from "../../lib/validation.js";
import {
  buildPersonaBodySchema,
  createPersonaBodySchema,
  listDiscoveryPersonasQuerySchema,
  listPublicPersonasQuerySchema,
  updatePersonaBodySchema,
} from "../../schemas/persona.js";
import type { PersonaBuilderService } from "../../services/persona-builder.service.js";
import type { PersonaEditorService } from "../../services/persona-editor.service.js";
import type { PairInsightService } from "../../services/pair-insight.service.js";
import type { PersonaService } from "../../services/persona.service.js";

/** Public read routes — no auth required */
export const createPersonaPublicRoutes = (personaService: PersonaService) => {
  const routes = new Hono();

  routes.get("/personas", async (c) => {
    const query = parseWithSchema(listPublicPersonasQuerySchema, c.req.query());
    const result = await personaService.listPublic(query);
    return jsonOk(c, result);
  });

  routes.get("/personas/:personaId", async (c) => {
    const personaId = c.req.param("personaId");
    const persona = await personaService.getById(personaId);

    if (!persona) {
      throw new ApiError(404, "PERSONA_NOT_FOUND", `Persona not found: ${personaId}`);
    }

    return jsonOk(c, persona);
  });

  return routes;
};

/** Protected write routes — require auth */
export const createPersonaRoutes = (options: {
  personaService: PersonaService;
  personaBuilderService: PersonaBuilderService;
  personaEditorService: PersonaEditorService;
  pairInsightService: PairInsightService;
}) => {
  const {
    personaService,
    personaBuilderService,
    personaEditorService,
    pairInsightService,
  } = options;
  const routes = new Hono();

  routes.get("/my/personas", async (c) => {
    const userId = c.get("userId");
    const items = await personaService.list(userId);
    return jsonOk(c, { items, total: items.length });
  });

  routes.get("/discovery/personas", async (c) => {
    const query = parseWithSchema(listDiscoveryPersonasQuerySchema, c.req.query());
    const userId = c.get("userId");
    const viewerPersona = await personaService.getById(query.viewerPersonaId);

    if (!viewerPersona || viewerPersona.userId !== userId) {
      throw new ApiError(
        403,
        "PERSONA_ACCESS_DENIED",
        `Persona does not belong to current user: ${query.viewerPersonaId}`,
      );
    }

    if (query.relationshipFilter === "chatted") {
      const relationshipResult = await pairInsightService.listViewerRelationships(
        query.viewerPersonaId,
        { limit: query.limit },
      );
      const personas = await personaService.listByIds(
        relationshipResult.items.map((item) => item.personaId),
      );
      const personaMap = new Map(personas.map((persona) => [persona.id, persona]));
      const items = relationshipResult.items.flatMap((item) => {
        const persona = personaMap.get(item.personaId);
        return persona
          ? [
            {
              ...persona,
              relationship: item.relationship,
            },
          ]
          : [];
      });

      return jsonOk(c, {
        items,
        total: relationshipResult.total,
        nextCursor: null,
      });
    }

    const excludePersonaIds =
      query.relationshipFilter === "new"
        ? await pairInsightService.listCounterpartIdsForViewer(query.viewerPersonaId)
        : undefined;
    const result = await personaService.listPublic({
      cursor: query.cursor,
      limit: query.limit,
      seed: query.seed,
      excludeUserId: userId,
      excludePersonaIds,
    });
    const relationships =
      query.relationshipFilter === "new"
        ? new Map()
        : await pairInsightService.listForViewer(
          query.viewerPersonaId,
          result.items.map((item) => item.id),
        );

    return jsonOk(c, {
      ...result,
      items: result.items.map((item) => ({
        ...item,
        relationship: relationships.get(item.id),
      })),
    });
  });

  routes.post("/personas", async (c) => {
    const body = await parseJsonBody(c, createPersonaBodySchema);
    const userId = c.get("userId");
    const persona = await personaService.create({ ...body, userId });
    return jsonOk(c, persona, 201);
  });

  routes.post("/personas/build", async (c) => {
    const body = await parseJsonBody(c, buildPersonaBodySchema);
    const userId = c.get("userId");
    const result = await personaBuilderService.buildPersona({
      userId,
      sourceText: body.sourceText,
      existingPersonaId: body.existingPersonaId,
    });
    return jsonOk(c, result, 201);
  });

  routes.patch("/personas/:personaId", async (c) => {
    const personaId = c.req.param("personaId");
    const body = await parseJsonBody(c, updatePersonaBodySchema);
    const userId = c.get("userId");
    await personaEditorService.updatePersona({
      personaId,
      userId,
      ...body,
    });
    const persona = await personaService.getById(personaId);
    return jsonOk(c, persona);
  });

  routes.post("/personas/:personaId/archive", async (c) => {
    const personaId = c.req.param("personaId");
    const userId = c.get("userId");
    const success = await personaEditorService.archivePersona(personaId, userId);
    if (!success) {
      throw new ApiError(404, "PERSONA_NOT_FOUND", `Persona not found: ${personaId}`);
    }
    return jsonOk(c, { archived: true });
  });

  routes.delete("/personas/:personaId", async (c) => {
    const personaId = c.req.param("personaId");
    const userId = c.get("userId");
    const success = await personaEditorService.deletePersona(personaId, userId);
    if (!success) {
      throw new ApiError(404, "PERSONA_NOT_FOUND", `Persona not found: ${personaId}`);
    }
    return jsonOk(c, { deleted: true });
  });

  routes.post("/personas/:personaId/activate", async (c) => {
    const personaId = c.req.param("personaId");
    const userId = c.get("userId");
    const success = await personaEditorService.activatePersona(personaId, userId);
    if (!success) {
      throw new ApiError(404, "PERSONA_NOT_FOUND", `Persona not found: ${personaId}`);
    }

    const persona = await personaService.getById(personaId);
    return jsonOk(c, persona);
  });

  return routes;
};
