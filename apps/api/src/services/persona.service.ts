import { and, eq, isNull } from "drizzle-orm";

import type { DbClient } from "@agent/db";
import { agentPersonas, users } from "@agent/db";

import { ApiError } from "../lib/api-error.js";
import { createId } from "../lib/id.js";
import type { CreatePersonaInput, Persona } from "./types.js";

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

  async exists(personaId: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: agentPersonas.id })
      .from(agentPersonas)
      .where(and(eq(agentPersonas.id, personaId), isNull(agentPersonas.deletedAt)))
      .limit(1);
    return rows.length > 0;
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
