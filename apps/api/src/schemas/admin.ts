import { MEMORY_ITEM_CATEGORIES, MEMORY_ITEM_SOURCES } from "@agent/db";
import { z } from "zod";

// ── Shared pagination ──────────────────────────────────────────────
export const timeSortQuerySchema = z.object({
  sortBy: z.enum(["createdAt", "updatedAt"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export const cursorPaginationQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
}).merge(timeSortQuerySchema);

// ── Users ──────────────────────────────────────────────────────────
export const listUsersQuerySchema = cursorPaginationQuerySchema.extend({
  search: z.string().optional(),
});

export const updateUserBodySchema = z.object({
  displayName: z.string().min(1).max(80).optional(),
  email: z.string().email().max(255).optional(),
});

export const batchUsersBodySchema = z.object({
  action: z.enum(["delete", "restore"]),
  userIds: z.array(z.string().min(1)).min(1).max(200),
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

export const batchPersonasBodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.enum(["delete", "restore"]),
    personaIds: z.array(z.string().min(1)).min(1).max(200),
  }),
  z.object({
    action: z.literal("update_status"),
    personaIds: z.array(z.string().min(1)).min(1).max(200),
    status: z.enum(["draft", "active", "archived"]),
  }),
]);

// ── Sessions ───────────────────────────────────────────────────────
export const listSessionsQuerySchema = cursorPaginationQuerySchema.extend({
  status: z
    .enum(["pending", "active", "paused", "completed", "failed"])
    .optional(),
});

export const updateSessionBodySchema = z.object({
  status: z.enum(["pending", "active", "paused", "completed", "failed"]),
});

export const batchSessionsBodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("delete"),
    sessionIds: z.array(z.string().min(1)).min(1).max(200),
  }),
  z.object({
    action: z.literal("update_status"),
    sessionIds: z.array(z.string().min(1)).min(1).max(200),
    status: z.enum(["pending", "active", "paused", "completed", "failed"]),
  }),
]);

// ── Messages ───────────────────────────────────────────────────────
export const listMessagesQuerySchema = cursorPaginationQuerySchema;

// ── Reports ────────────────────────────────────────────────────────
export const listReportsQuerySchema = cursorPaginationQuerySchema.extend({
  status: z
    .enum(["pending", "generating", "completed", "failed"])
    .optional(),
});

export const batchReportsBodySchema = z.object({
  action: z.literal("delete"),
  reportIds: z.array(z.string().min(1)).min(1).max(200),
});

// ── Memory Items ───────────────────────────────────────────────────
export const listMemoryItemsQuerySchema = cursorPaginationQuerySchema.extend({
  personaId: z.string().optional(),
  category: z.enum(MEMORY_ITEM_CATEGORIES).optional(),
  source: z.enum(MEMORY_ITEM_SOURCES).optional(),
});

export const updateMemoryItemBodySchema = z.object({
  content: z.string().min(1).optional(),
  weight: z.number().min(0).max(1).optional(),
  category: z.enum(MEMORY_ITEM_CATEGORIES).optional(),
});

export const batchMemoryItemsBodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("delete"),
    memoryIds: z.array(z.string().min(1)).min(1).max(200),
  }),
  z
    .object({
      action: z.literal("update"),
      memoryIds: z.array(z.string().min(1)).min(1).max(200),
      content: z.string().min(1).optional(),
      weight: z.number().min(0).max(1).optional(),
      category: z.enum(MEMORY_ITEM_CATEGORIES).optional(),
    })
    .refine(
      (value) =>
        value.content !== undefined ||
        value.weight !== undefined ||
        value.category !== undefined,
      {
        message: "At least one update field (content, weight, category) is required.",
      },
    ),
]);

// ── System Configs ─────────────────────────────────────────────────
export const upsertConfigBodySchema = z.object({
  configValue: z.string().min(1),
  valueType: z.enum(["string", "number", "boolean", "json"]),
  description: z.string().max(500).optional(),
  isSecret: z.boolean().optional(),
});

export const batchConfigsBodySchema = z.object({
  action: z.literal("delete"),
  configKeys: z.array(z.string().min(1)).min(1).max(200),
});

export const listConfigsQuerySchema = z.object({
  sortBy: z.enum(["createdAt", "updatedAt"]).default("updatedAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});
