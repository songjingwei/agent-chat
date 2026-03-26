import { z } from "zod";

// ── Shared pagination ──────────────────────────────────────────────
export const cursorPaginationQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ── Users ──────────────────────────────────────────────────────────
export const listUsersQuerySchema = cursorPaginationQuerySchema.extend({
  search: z.string().optional(),
});

export const updateUserBodySchema = z.object({
  displayName: z.string().min(1).max(80).optional(),
  email: z.string().email().max(255).optional(),
});

// ── Personas ───────────────────────────────────────────────────────
export const listPersonasQuerySchema = cursorPaginationQuerySchema.extend({
  status: z.enum(["draft", "active", "archived"]).optional(),
  userId: z.string().optional(),
});

export const updatePersonaBodySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  bio: z.string().optional(),
  systemPrompt: z.string().optional(),
  traits: z.array(z.string()).optional(),
  status: z.enum(["draft", "active", "archived"]).optional(),
});

// ── Sessions ───────────────────────────────────────────────────────
export const listSessionsQuerySchema = cursorPaginationQuerySchema.extend({
  status: z
    .enum(["pending", "active", "paused", "completed", "failed"])
    .optional(),
});

export const updateSessionBodySchema = z.object({
  status: z.enum(["pending", "active", "paused", "completed", "failed"]),
});

// ── Messages ───────────────────────────────────────────────────────
export const listMessagesQuerySchema = cursorPaginationQuerySchema;

// ── Reports ────────────────────────────────────────────────────────
export const listReportsQuerySchema = cursorPaginationQuerySchema.extend({
  status: z
    .enum(["pending", "generating", "completed", "failed"])
    .optional(),
});

// ── Memory Items ───────────────────────────────────────────────────
export const listMemoryItemsQuerySchema = cursorPaginationQuerySchema.extend({
  personaId: z.string().optional(),
  category: z.enum(["fact", "preference", "experience", "instruction"]).optional(),
  source: z.enum(["agent_inferred", "human_override", "system"]).optional(),
});

export const updateMemoryItemBodySchema = z.object({
  content: z.string().min(1).optional(),
  weight: z.number().min(0).max(1).optional(),
  category: z.enum(["fact", "preference", "experience", "instruction"]).optional(),
});

// ── System Configs ─────────────────────────────────────────────────
export const upsertConfigBodySchema = z.object({
  configValue: z.string().min(1),
  valueType: z.enum(["string", "number", "boolean", "json"]),
  description: z.string().max(500).optional(),
  isSecret: z.boolean().optional(),
});
