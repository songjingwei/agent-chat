import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

export type SuccessEnvelope<T> = {
  success: true;
  data: T;
};

export type ErrorEnvelope = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export const jsonOk = <T>(
  c: Context,
  data: T,
  status: ContentfulStatusCode = 200,
) => {
  return c.json<SuccessEnvelope<T>>(
    {
      success: true,
      data,
    },
    status,
  );
};

export const jsonError = (
  c: Context,
  status: ContentfulStatusCode,
  code: string,
  message: string,
  details?: unknown,
) => {
  const error: ErrorEnvelope["error"] = {
    code,
    message,
  };

  if (details !== undefined) {
    error.details = details;
  }

  return c.json<ErrorEnvelope>(
    {
      success: false,
      error,
    },
    status,
  );
};
