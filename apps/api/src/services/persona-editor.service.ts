import { and, eq, isNull } from "drizzle-orm";

import type { DbClient } from "@agent/db";
import { agentPersonas } from "@agent/db";

import { ApiError } from "../lib/api-error.js";

export interface UpdatePersonaInput {
  personaId: string;
  userId: string;
  displayName?: string | undefined;
  bio?: string | undefined;
  traits?: string[] | undefined;
  systemPrompt?: string | undefined;
}

export class PersonaEditorService {
  readonly #db: DbClient;

  constructor(db: DbClient) {
    this.#db = db;
  }

  async updatePersona(input: UpdatePersonaInput): Promise<boolean> {
    const existing = await this.#db
      .select({ id: agentPersonas.id })
      .from(agentPersonas)
      .where(
        and(
          eq(agentPersonas.id, input.personaId),
          eq(agentPersonas.userId, input.userId),
          isNull(agentPersonas.deletedAt),
        ),
      )
      .limit(1);

    if (existing.length === 0) {
      throw new ApiError(404, "PERSONA_NOT_FOUND", "Persona not found");
    }

    const updates: Record<string, unknown> = {
      updatedAt: new Date(),
      updatedBy: input.userId,
    };

    if (input.displayName !== undefined) {
      updates.name = input.displayName;
    }
    if (input.bio !== undefined) {
      updates.bio = input.bio;
    }
    if (input.traits !== undefined) {
      updates.traits = input.traits;
    }
    if (input.systemPrompt !== undefined) {
      updates.systemPrompt = input.systemPrompt;
    }

    const updated = await this.#db
      .update(agentPersonas)
      .set(updates)
      .where(
        and(
          eq(agentPersonas.id, input.personaId),
          eq(agentPersonas.userId, input.userId),
        ),
      )
      .returning({ id: agentPersonas.id });

    return updated.length > 0;
  }

  async archivePersona(
    personaId: string,
    userId: string,
  ): Promise<boolean> {
    const updated = await this.#db
      .update(agentPersonas)
      .set({
        status: "archived",
        updatedAt: new Date(),
        updatedBy: userId,
      })
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

  async activatePersona(
    personaId: string,
    userId: string,
  ): Promise<boolean> {
    const updated = await this.#db
      .update(agentPersonas)
      .set({
        status: "active",
        updatedAt: new Date(),
        updatedBy: userId,
      })
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

  async deletePersona(
    personaId: string,
    userId: string,
  ): Promise<boolean> {
    const now = new Date();
    const updated = await this.#db
      .update(agentPersonas)
      .set({
        deletedAt: now,
        updatedAt: now,
        updatedBy: userId,
      })
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
