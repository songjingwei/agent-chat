import { Hono } from "hono";

import { ApiError } from "../../lib/api-error.js";
import { jsonOk } from "../../lib/http.js";
import { parseJsonBody } from "../../lib/validation.js";
import { createPersonaBodySchema } from "../../schemas/persona.js";
import type { PersonaService } from "../../services/persona.service.js";

/** Public read routes — no auth required */
export const createPersonaPublicRoutes = (personaService: PersonaService) => {
  const routes = new Hono();

  routes.get("/personas", (c) => {
    const items = personaService.list();

    return jsonOk(c, {
      items,
      total: items.length,
    });
  });

  routes.get("/personas/:personaId", (c) => {
    const personaId = c.req.param("personaId");
    const persona = personaService.getById(personaId);

    if (!persona) {
      throw new ApiError(404, "PERSONA_NOT_FOUND", `Persona not found: ${personaId}`);
    }

    return jsonOk(c, persona);
  });

  return routes;
};

/** Protected write routes — require auth */
export const createPersonaRoutes = (personaService: PersonaService) => {
  const routes = new Hono();

  routes.post("/personas", async (c) => {
    const body = await parseJsonBody(c, createPersonaBodySchema);
    const userId = c.get("userId");
    const persona = personaService.create({ ...body, userId });
    return jsonOk(c, persona, 201);
  });

  return routes;
};
