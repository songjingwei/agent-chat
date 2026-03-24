import { createHash } from "node:crypto";

import { and, desc, eq, isNull, ne, sql } from "drizzle-orm";

import type { DbClient } from "@agent/db";
import { agentPersonas, users } from "@agent/db";

import { apiConfig } from "../config.js";
import { ApiError } from "../lib/api-error.js";
import { createId } from "../lib/id.js";
import {
  createRedisPersonaTotalCache,
  type PersonaTotalCache,
} from "./persona-total-cache.service.js";
import type {
  CreatePersonaInput,
  ListPublicPersonasInput,
  ListPublicPersonasResult,
  Persona,
} from "./types.js";

interface PersonaServiceOptions {
  totalCache?: PersonaTotalCache | null;
}

export class PersonaService {
  readonly #totalCache: PersonaTotalCache | null;

  constructor(private readonly db: DbClient, options: PersonaServiceOptions = {}) {
    const disableCache = process.env.NODE_ENV === "test";
    this.#totalCache =
      options.totalCache === undefined
        ? disableCache
          ? null
          : createRedisPersonaTotalCache({
            redisUrl: apiConfig.redisUrl,
          })
        : options.totalCache;
  }

  async create(input: CreatePersonaInput): Promise<Persona> {
    const userRows = await this.db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, input.userId), isNull(users.deletedAt)))
      .limit(1);
    if (userRows.length === 0) {
      throw new ApiError(404, "USER_NOT_FOUND", `User not found: ${input.userId}`);
    }

    const now = new Date();
    const createdRows = await this.db
      .insert(agentPersonas)
      .values({
        id: createId("prs"),
        userId: input.userId,
        name: input.displayName,
        bio: input.bio,
        traits: input.traits,
        version: 1,
        status: "active",
        createdBy: input.userId,
        updatedBy: input.userId,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    await this.tryInvalidateActiveTotalCache();

    return mapPersona(createdRows[0]!);
  }

  async getById(personaId: string): Promise<Persona | undefined> {
    const rows = await this.db
      .select()
      .from(agentPersonas)
      .where(and(eq(agentPersonas.id, personaId), isNull(agentPersonas.deletedAt)))
      .limit(1);
    return rows[0] ? mapPersona(rows[0]) : undefined;
  }

  async list(userId?: string): Promise<Persona[]> {
    const rows = await this.db
      .select()
      .from(agentPersonas)
      .where(
        userId
          ? and(
            eq(agentPersonas.userId, userId),
            isNull(agentPersonas.deletedAt),
          )
          : isNull(agentPersonas.deletedAt),
      );
    return rows.map(mapPersona);
  }

  async listPublic(input: ListPublicPersonasInput): Promise<ListPublicPersonasResult> {
    const seed = input.seed;
    const cursor = parsePersonaCursor(input.cursor, seed);
    const limit = Math.min(Math.max(input.limit, 1), 50);
    const sortKeyExpr = sql<string>`md5(${agentPersonas.id} || ':' || ${seed})`;
    const totalConditions = [
      isNull(agentPersonas.deletedAt),
      eq(agentPersonas.status, "active"),
    ];
    const listConditions = [...totalConditions];

    if (input.excludeUserId) {
      listConditions.push(ne(agentPersonas.userId, input.excludeUserId));
    }

    const cursorCondition = cursor
      ? sql`(${sortKeyExpr} < ${cursor.sortKey} OR (${sortKeyExpr} = ${cursor.sortKey} AND ${agentPersonas.id} < ${cursor.id}))`
      : undefined;

    const conditions = cursorCondition
      ? [...listConditions, cursorCondition]
      : listConditions;

    const rows = await this.db
      .select()
      .from(agentPersonas)
      .where(and(...conditions))
      .orderBy(sql`${sortKeyExpr} DESC`, desc(agentPersonas.id))
      .limit(limit + 1);

    const itemsRows = rows.slice(0, limit);
    const hasNextPage = rows.length > limit;
    const nextCursor = hasNextPage
      ? encodePersonaCursor(itemsRows[itemsRows.length - 1]!, seed)
      : null;

    const cachedTotal = await this.readCachedActiveTotal();
    const total = cachedTotal ?? (await this.readAndCacheActiveTotal());

    return {
      items: itemsRows.map(mapPersona),
      total,
      nextCursor,
    };
  }

  async exists(personaId: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: agentPersonas.id })
      .from(agentPersonas)
      .where(and(eq(agentPersonas.id, personaId), isNull(agentPersonas.deletedAt)))
      .limit(1);
    return rows.length > 0;
  }

  private async readAndCacheActiveTotal() {
    const totalRows = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(agentPersonas)
      .where(
        and(
          isNull(agentPersonas.deletedAt),
          eq(agentPersonas.status, "active"),
        ),
      );

    const total = totalRows[0]?.count ?? 0;
    if (this.#totalCache) {
      try {
        await this.#totalCache.setActiveTotal(total);
      } catch {
        // Ignore cache write failures and fall back to database reads.
      }
    }
    return total;
  }

  private async readCachedActiveTotal() {
    if (!this.#totalCache) {
      return null;
    }

    try {
      return await this.#totalCache.getActiveTotal();
    } catch {
      return null;
    }
  }

  private async tryInvalidateActiveTotalCache() {
    if (!this.#totalCache) {
      return;
    }

    try {
      await this.#totalCache.invalidateActiveTotal();
    } catch {
      // Ignore cache invalidation failures and rely on TTL fallback.
    }
  }
}

function encodePersonaCursor(row: typeof agentPersonas.$inferSelect, seed: string) {
  const payload = JSON.stringify({
    sortKey: computePersonaSortKey(row.id, seed),
    id: row.id,
    seed,
  });
  return Buffer.from(payload, "utf8").toString("base64url");
}

function parsePersonaCursor(cursor: string | undefined, seed: string) {
  if (!cursor) {
    return null;
  }

  try {
    const decoded = Buffer.from(cursor, "base64url").toString("utf8");
    const parsed = JSON.parse(decoded) as {
      sortKey?: string;
      id?: string;
      seed?: string;
    };
    if (!parsed.sortKey || !parsed.id || !parsed.seed) {
      throw new Error("Missing cursor fields.");
    }
    if (parsed.seed !== seed) {
      throw new Error("Cursor seed mismatch.");
    }

    return {
      sortKey: parsed.sortKey,
      id: parsed.id,
    };
  } catch {
    throw new ApiError(400, "VALIDATION_ERROR", "Invalid cursor.");
  }
}

function computePersonaSortKey(id: string, seed: string) {
  return createHash("md5").update(`${id}:${seed}`).digest("hex");
}

function mapPersona(row: typeof agentPersonas.$inferSelect): Persona {
  return {
    id: row.id,
    userId: row.userId,
    displayName: row.name,
    bio: row.bio ?? undefined,
    traits: row.traits ?? [],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
