import { Hono } from "hono";

import { ApiError } from "../../lib/api-error.js";
import { jsonOk } from "../../lib/http.js";
import { parseJsonBody, parseWithSchema } from "../../lib/validation.js";
import { createPersonaBodySchema, listPersonasQuerySchema } from "../../schemas/persona.js";
import type { PersonaService } from "../../services/persona.service.js";

export const createPersonaRoutes = (personaService: PersonaService) => {
  const routes = new Hono();

  routes.post("/personas", async (c) => {
    const body = await parseJsonBody(c, createPersonaBodySchema);
    const persona = personaService.create(body);
    return jsonOk(c, persona, 201);
  });

  routes.get("/personas", (c) => {
    const query = parseWithSchema(listPersonasQuerySchema, c.req.query());
    const items = personaService.list(query.userId);

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
