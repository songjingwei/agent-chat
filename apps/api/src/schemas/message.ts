import { z } from "zod";

export const createHumanMessageBodySchema = z.object({
  authorPersonaId: z.string().min(1),
  content: z.string().trim().min(1).max(2000),
});

export const latestReportQuerySchema = z.object({
  personaId: z.string().min(1),
});
