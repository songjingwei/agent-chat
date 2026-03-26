import { z } from "zod";

export const createPersonaBodySchema = z.object({
  displayName: z.string().min(1).max(80),
  bio: z.string().max(1000).optional(),
  traits: z.array(z.string().min(1).max(80)).max(20).default([]),
});

export const listPublicPersonasQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(24),
  excludeUserId: z.string().min(1).max(64).optional(),
  seed: z.string().min(1).max(120).default("default-seed"),
});

export const listDiscoveryPersonasQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(24),
  viewerPersonaId: z.string().min(1).max(64),
  relationshipFilter: z.enum(["all", "chatted", "new"]).default("all"),
  seed: z.string().min(1).max(120).default("default-seed"),
});

export const buildPersonaBodySchema = z.object({
  sourceText: z.string().min(1).max(50000),
  existingPersonaId: z.string().min(1).max(64).optional(),
});

export const updatePersonaBodySchema = z.object({
  displayName: z.string().min(1).max(80).optional(),
  bio: z.string().max(1000).optional(),
  traits: z.array(z.string().min(1).max(80)).max(20).optional(),
  systemPrompt: z.string().max(5000).optional(),
});
