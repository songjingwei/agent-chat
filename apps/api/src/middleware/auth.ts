import { createMiddleware } from "hono/factory";
import jwt from "jsonwebtoken";

import { AUTH_TOKEN_EXPIRED, AUTH_TOKEN_INVALID, AUTH_UNAUTHORIZED } from "@agent/shared";

import { apiConfig } from "../config.js";
import { ApiError } from "../lib/api-error.js";

declare module "hono" {
  interface ContextVariableMap {
    userId: string;
    userEmail: string;
  }
}

export const authMiddleware = createMiddleware(async (c, next) => {
  // Skip auth for internal tool routes (e.g. Bull Board)
  if (c.req.path.startsWith("/_queue")) {
    return next();
  }

  const header = c.req.header("Authorization");
  if (!header?.startsWith("Bearer ")) {
    throw new ApiError(
      401,
      AUTH_UNAUTHORIZED,
      "Missing or invalid Authorization header.",
    );
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, apiConfig.jwtSecret) as {
      sub: string;
      email: string;
    };
    c.set("userId", payload.sub);
    c.set("userEmail", payload.email);
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new ApiError(401, AUTH_TOKEN_EXPIRED, "Access token has expired.");
    }
    throw new ApiError(401, AUTH_TOKEN_INVALID, "Invalid access token.");
  }

  await next();
});
