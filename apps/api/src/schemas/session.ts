import { z } from "zod";

export const createSessionBodySchema = z
  .object({
    initiatorPersonaId: z.string().min(1),
    targetPersonaId: z.string().min(1),
  })
  .refine((value) => value.initiatorPersonaId !== value.targetPersonaId, {
    path: ["targetPersonaId"],
    message: "initiatorPersonaId and targetPersonaId must be different.",
  });

export const listSessionsQuerySchema = z.object({
  personaId: z.string().min(1).optional(),
  userId: z.string().min(1).max(128).optional(),
});
