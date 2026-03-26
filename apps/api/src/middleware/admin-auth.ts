import { createMiddleware } from "hono/factory";
import jwt from "jsonwebtoken";

import { apiConfig } from "../config.js";
import { ApiError } from "../lib/api-error.js";

declare module "hono" {
  interface ContextVariableMap {
    adminId: string;
    adminRole: string;
  }
}

export const adminAuthMiddleware = createMiddleware(async (c, next) => {
  const header = c.req.header("Authorization");
  if (!header?.startsWith("Bearer ")) {
    throw new ApiError(
      401,
      "ADMIN_UNAUTHORIZED",
      "Missing or invalid Authorization header.",
    );
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, apiConfig.jwtSecret) as {
      sub: string;
      role: string;
      type: string;
    };

    if (payload.type !== "admin") {
      throw new ApiError(
        403,
        "ADMIN_FORBIDDEN",
        "This endpoint requires admin privileges.",
      );
    }

    c.set("adminId", payload.sub);
    c.set("adminRole", payload.role);
  } catch (err) {
    if (err instanceof ApiError) {
      throw err;
    }
    if (err instanceof jwt.TokenExpiredError) {
      throw new ApiError(
        401,
        "ADMIN_TOKEN_EXPIRED",
        "Admin access token has expired.",
      );
    }
    throw new ApiError(
      401,
      "ADMIN_TOKEN_INVALID",
      "Invalid admin access token.",
    );
  }

  await next();
});
