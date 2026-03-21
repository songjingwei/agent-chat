import { z } from "zod";

export const createPersonaBodySchema = z.object({
  userId: z.string().min(1).max(128),
  displayName: z.string().min(1).max(80),
  bio: z.string().max(1000).optional(),
  traits: z.array(z.string().min(1).max(80)).max(20).default([]),
});

export const listPersonasQuerySchema = z.object({
  userId: z.string().min(1).optional(),
});
