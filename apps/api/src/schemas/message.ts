import { z } from "zod";

export const createHumanMessageBodySchema = z.object({
  authorPersonaId: z.string().min(1),
  content: z.string().trim().min(1).max(2000),
});

export const listMessagesQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  scope: z.enum(["session", "pair"]).optional(),
});

export const latestReportQuerySchema = z.object({
  personaId: z.string().min(1),
});
