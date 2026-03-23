import { and, desc, eq, inArray, isNull, or } from "drizzle-orm";

import type { DbClient } from "@agent/db";
import { agentPersonas, chatSessions } from "@agent/db";

import { ApiError } from "../lib/api-error.js";
import { createId } from "../lib/id.js";
import type {
  CreateSessionInput,
  ListSessionsInput,
  Session,
  SessionStatus,
} from "./types.js";

export class SessionService {
  constructor(private readonly db: DbClient) {}

  async create(input: CreateSessionInput): Promise<Session> {
    const [initiatorPersona, targetPersona] = await Promise.all([
      this.findActivePersona(input.initiatorPersonaId),
      this.findActivePersona(input.targetPersonaId),
    ]);

    if (!initiatorPersona) {
      throw new ApiError(404, "PERSONA_NOT_FOUND", `Persona not found: ${input.initiatorPersonaId}`);
    }

    if (!targetPersona) {
      throw new ApiError(404, "PERSONA_NOT_FOUND", `Persona not found: ${input.targetPersonaId}`);
    }

    const now = new Date();
    const createdRows = await this.db
      .insert(chatSessions)
      .values({
        id: createId("ses"),
        initiatorPersonaId: input.initiatorPersonaId,
        targetPersonaId: input.targetPersonaId,
        status: "pending",
        currentRound: 0,
        maxRounds: 20,
        createdBy: initiatorPersona.userId,
        updatedBy: initiatorPersona.userId,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return mapSession(createdRows[0]!);
  }

  async list(filters: ListSessionsInput = {}): Promise<Session[]> {
    const conditions = [isNull(chatSessions.deletedAt)];

    if (filters.personaId) {
      conditions.push(
        or(
          eq(chatSessions.initiatorPersonaId, filters.personaId),
          eq(chatSessions.targetPersonaId, filters.personaId),
        )!,
      );
    }

    if (filters.userId) {
      const personaRows = await this.db
        .select({ id: agentPersonas.id })
        .from(agentPersonas)
        .where(
          and(
            eq(agentPersonas.userId, filters.userId),
            isNull(agentPersonas.deletedAt),
          ),
        );
      const userPersonaIds = personaRows.map((row) => row.id);

      if (userPersonaIds.length === 0) {
        return [];
      }

      conditions.push(
        or(
          inArray(chatSessions.initiatorPersonaId, userPersonaIds),
          inArray(chatSessions.targetPersonaId, userPersonaIds),
        )!,
      );
    }

    const rows = await this.db
      .select()
      .from(chatSessions)
      .where(and(...conditions))
      .orderBy(desc(chatSessions.updatedAt));

    return rows.map(mapSession);
  }

  async getById(sessionId: string): Promise<Session | undefined> {
    const rows = await this.db
      .select()
      .from(chatSessions)
      .where(and(eq(chatSessions.id, sessionId), isNull(chatSessions.deletedAt)))
      .limit(1);
    return rows[0] ? mapSession(rows[0]) : undefined;
  }

  async updateStatus(sessionId: string, status: SessionStatus): Promise<Session> {
    const updatedRows = await this.db
      .update(chatSessions)
      .set({ status: toDbSessionStatus(status), updatedAt: new Date() })
      .where(and(eq(chatSessions.id, sessionId), isNull(chatSessions.deletedAt)))
      .returning();
    const updated = updatedRows[0];
    if (!updated) {
      throw new ApiError(404, "SESSION_NOT_FOUND", `Session not found: ${sessionId}`);
    }

    return mapSession(updated);
  }

  private async findActivePersona(personaId: string) {
    const rows = await this.db
      .select({
        id: agentPersonas.id,
        userId: agentPersonas.userId,
      })
      .from(agentPersonas)
      .where(and(eq(agentPersonas.id, personaId), isNull(agentPersonas.deletedAt)))
      .limit(1);
    return rows[0] ?? null;
  }
}

function toDbSessionStatus(status: SessionStatus) {
  if (status === "queued") {
    return "pending";
  }
  return status;
}

function mapSession(row: typeof chatSessions.$inferSelect): Session {
  return {
    id: row.id,
    initiatorPersonaId: row.initiatorPersonaId,
    targetPersonaId: row.targetPersonaId,
    status: mapSessionStatus(row.status),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapSessionStatus(status: string): SessionStatus {
  if (status === "pending") {
    return "queued";
  }
  if (status === "active") {
    return "active";
  }
  return "completed";
}
