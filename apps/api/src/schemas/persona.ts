import { z } from "zod";

export const createPersonaBodySchema = z.object({
  displayName: z.string().min(1).max(80),
  bio: z.string().max(1000).optional(),
  traits: z.array(z.string().min(1).max(80)).max(20).default([]),
});
