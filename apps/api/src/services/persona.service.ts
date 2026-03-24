import { and, desc, eq, isNull, lt, ne, or, sql } from "drizzle-orm";

import type { DbClient } from "@agent/db";
import { agentPersonas, users } from "@agent/db";

import { ApiError } from "../lib/api-error.js";
import { createId } from "../lib/id.js";
import type {
  CreatePersonaInput,
  ListPublicPersonasInput,
  ListPublicPersonasResult,
  Persona,
} from "./types.js";

export class PersonaService {
  constructor(private readonly db: DbClient) {}

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
    const cursor = parsePersonaCursor(input.cursor);
    const limit = Math.min(Math.max(input.limit, 1), 50);
    const baseConditions = [
      isNull(agentPersonas.deletedAt),
      eq(agentPersonas.status, "active"),
    ];

    if (input.excludeUserId) {
      baseConditions.push(ne(agentPersonas.userId, input.excludeUserId));
    }

    const cursorCondition = cursor
      ? or(
        lt(agentPersonas.updatedAt, cursor.updatedAt),
        and(
          eq(agentPersonas.updatedAt, cursor.updatedAt),
          lt(agentPersonas.id, cursor.id),
        ),
      )
      : undefined;

    const conditions = cursorCondition
      ? [...baseConditions, cursorCondition]
      : baseConditions;

    const rows = await this.db
      .select()
      .from(agentPersonas)
      .where(and(...conditions))
      .orderBy(desc(agentPersonas.updatedAt), desc(agentPersonas.id))
      .limit(limit + 1);

    const itemsRows = rows.slice(0, limit);
    const hasNextPage = rows.length > limit;
    const nextCursor = hasNextPage
      ? encodePersonaCursor(itemsRows[itemsRows.length - 1]!)
      : null;

    const totalRows = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(agentPersonas)
      .where(and(...baseConditions));

    return {
      items: itemsRows.map(mapPersona),
      total: totalRows[0]?.count ?? 0,
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
}

function encodePersonaCursor(row: typeof agentPersonas.$inferSelect) {
  const payload = JSON.stringify({
    updatedAt: row.updatedAt.toISOString(),
    id: row.id,
  });
  return Buffer.from(payload, "utf8").toString("base64url");
}

function parsePersonaCursor(cursor?: string) {
  if (!cursor) {
    return null;
  }

  try {
    const decoded = Buffer.from(cursor, "base64url").toString("utf8");
    const parsed = JSON.parse(decoded) as { updatedAt?: string; id?: string };
    if (!parsed.updatedAt || !parsed.id) {
      throw new Error("Missing cursor fields.");
    }

    const updatedAt = new Date(parsed.updatedAt);
    if (Number.isNaN(updatedAt.getTime())) {
      throw new Error("Invalid updatedAt.");
    }

    return {
      updatedAt,
      id: parsed.id,
    };
  } catch {
    throw new ApiError(400, "VALIDATION_ERROR", "Invalid cursor.");
  }
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
