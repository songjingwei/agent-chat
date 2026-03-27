import { z } from "zod";

export const createAssessmentSessionBodySchema = z.object({
  personaId: z.string().min(1).max(64),
  templateSlug: z.string().min(1).max(120).optional(),
});

export const submitAssessmentAnswerBodySchema = z
  .object({
    sessionItemId: z.string().min(1).max(64),
    selectedOptionValue: z.string().min(1).max(120).optional(),
    freeTextAnswer: z.string().min(1).max(4000).nullable().optional(),
  })
  .refine(
    (value) =>
      value.selectedOptionValue !== undefined ||
      (typeof value.freeTextAnswer === "string" &&
        value.freeTextAnswer.trim().length > 0),
    {
      message: "Either selectedOptionValue or freeTextAnswer is required.",
    },
  );
