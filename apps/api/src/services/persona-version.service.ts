import { and, eq, isNull } from "drizzle-orm";

import type { DbClient } from "@agent/db";
import { agentPersonas } from "@agent/db";

export interface PersonaVersionInfo {
  id: string;
  version: number;
  name: string;
  bio: string | null;
  traits: string[];
  systemPrompt: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export class PersonaVersionService {
  readonly #db: DbClient;

  constructor(db: DbClient) {
    this.#db = db;
  }

  async getCurrentVersion(
    personaId: string,
    userId: string,
  ): Promise<PersonaVersionInfo | null> {
    const rows = await this.#db
      .select({
        id: agentPersonas.id,
        version: agentPersonas.version,
        name: agentPersonas.name,
        bio: agentPersonas.bio,
        traits: agentPersonas.traits,
        systemPrompt: agentPersonas.systemPrompt,
        status: agentPersonas.status,
        createdAt: agentPersonas.createdAt,
        updatedAt: agentPersonas.updatedAt,
      })
      .from(agentPersonas)
      .where(
        and(
          eq(agentPersonas.id, personaId),
          eq(agentPersonas.userId, userId),
          isNull(agentPersonas.deletedAt),
        ),
      )
      .limit(1);

    if (rows.length === 0) {
      return null;
    }

    const row = rows[0]!;
    return {
      ...row,
      traits: row.traits ?? [],
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async activate(
    personaId: string,
    userId: string,
  ): Promise<boolean> {
    const updated = await this.#db
      .update(agentPersonas)
      .set({ status: "active", updatedAt: new Date(), updatedBy: userId })
      .where(
        and(
          eq(agentPersonas.id, personaId),
          eq(agentPersonas.userId, userId),
          isNull(agentPersonas.deletedAt),
        ),
      )
      .returning({ id: agentPersonas.id });

    return updated.length > 0;
  }
}
