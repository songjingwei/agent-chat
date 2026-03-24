import { z } from "zod";

export const createPersonaBodySchema = z.object({
  displayName: z.string().min(1).max(80),
  bio: z.string().max(1000).optional(),
  traits: z.array(z.string().min(1).max(80)).max(20).default([]),
});

export const listPublicPersonasQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(24),
  excludeUserId: z.string().min(1).max(64).optional(),
});
