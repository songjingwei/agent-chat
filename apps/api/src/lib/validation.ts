import type { Context } from "hono";
import type { z, ZodType } from "zod";

import { ApiError } from "./api-error";

const defaultValidationMessage = "Request validation failed.";

export const parseWithSchema = <Schema extends ZodType>(
  schema: Schema,
  input: unknown,
  message = defaultValidationMessage,
): z.infer<Schema> => {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new ApiError(400, "VALIDATION_ERROR", message, result.error.issues);
  }

  return result.data;
};

export const parseJsonBody = async <Schema extends ZodType>(
  c: Context,
  schema: Schema,
  message = defaultValidationMessage,
): Promise<z.infer<Schema>> => {
  let payload: unknown;

  try {
    payload = await c.req.json();
  } catch {
    throw new ApiError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  return parseWithSchema(schema, payload, message);
};
