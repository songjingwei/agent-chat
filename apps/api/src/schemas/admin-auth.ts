import { z } from "zod";

export const adminLoginBodySchema = z.object({
  username: z
    .string()
    .min(2, "Username must be at least 2 characters.")
    .max(80),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters.")
    .max(128),
});

export const adminRefreshBodySchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required."),
});
