import { and, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";

import type { DbClient } from "@agent/db";
import { agentPersonas, chatMessages, chatSessions, DEFAULT_SESSION_MAX_ROUNDS } from "@agent/db";

import { ApiError } from "../lib/api-error.js";
import { createId } from "../lib/id.js";
import type {
  CreateSessionInput,
  ListSessionsInput,
  Session,
  SessionStatus,
} from "./types.js";

interface SessionServiceOptions {
  defaultMaxRounds?: number;
}

export class SessionService {
  constructor(
    private readonly db: DbClient,
    private readonly options: SessionServiceOptions = {},
  ) {}

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

    // Check if an active/pending session already exists for this pair
    const existingActive = await this.db
      .select()
      .from(chatSessions)
      .where(
        and(
          eq(chatSessions.initiatorPersonaId, input.initiatorPersonaId),
          eq(chatSessions.targetPersonaId, input.targetPersonaId),
          inArray(chatSessions.status, ["pending", "active", "paused"]),
          isNull(chatSessions.deletedAt),
        ),
      )
      .limit(1);

    if (existingActive[0]) {
      return mapSession(existingActive[0]);
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
        maxRounds:
          this.options.defaultMaxRounds ?? DEFAULT_SESSION_MAX_ROUNDS,
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

    const allRows = await this.db
      .select()
      .from(chatSessions)
      .where(and(...conditions))
      .orderBy(desc(chatSessions.updatedAt));

    // Aggregate sessions by persona pair
    const aggregated = new Map<string, typeof chatSessions.$inferSelect>();
    for (const row of allRows) {
      // Sort IDs to create a unique key for the pair regardless of direction
      const pairKey = [row.initiatorPersonaId, row.targetPersonaId].sort().join(":");
      const existing = aggregated.get(pairKey);

      if (!existing) {
        aggregated.set(pairKey, row);
        continue;
      }

      // Prioritize active/pending over completed
      const isCurrentActive = ["pending", "active", "paused"].includes(row.status);
      const isExistingActive = ["pending", "active", "paused"].includes(existing.status);

      if (isCurrentActive && !isExistingActive) {
        aggregated.set(pairKey, row);
      } else if (isCurrentActive === isExistingActive) {
        // Both same category, take the most recent one (though sorted by updatedAt, 
        // this is just defensive)
        if (new Date(row.updatedAt) > new Date(existing.updatedAt)) {
          aggregated.set(pairKey, row);
        }
      }
    }

    const aggregatedRows = Array.from(aggregated.values())
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    // Fetch last message for each aggregated session
    const sessionIds = aggregatedRows.map(r => r.id);
    const lastMessages = sessionIds.length > 0 ? await this.db
      .select({
        sessionId: chatMessages.sessionId,
        content: chatMessages.content,
      })
      .from(chatMessages)
      .where(inArray(chatMessages.sessionId, sessionIds))
      .orderBy(desc(chatMessages.createdAt)) : [];

    // Map to sessionId -> content (only first/latest one)
    const messageMap = new Map<string, string>();
    for (const msg of lastMessages) {
      if (!messageMap.has(msg.sessionId)) {
        messageMap.set(msg.sessionId, msg.content);
      }
    }

    return aggregatedRows.map(row => mapSession(row, messageMap.get(row.id)));
  }

  async getById(sessionId: string): Promise<Session | undefined> {
    const rows = await this.db
      .select()
      .from(chatSessions)
      .where(and(eq(chatSessions.id, sessionId), isNull(chatSessions.deletedAt)))
      .limit(1);
    
    if (!rows[0]) return undefined;

    const lastMsg = await this.db
      .select({ content: chatMessages.content })
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
      .orderBy(desc(chatMessages.createdAt))
      .limit(1);

    return mapSession(rows[0], lastMsg[0]?.content);
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

  async incrementRound(sessionId: string): Promise<Session> {
    const updatedRows = await this.db
      .update(chatSessions)
      .set({
        currentRound: sql`${chatSessions.currentRound} + 1`,
        status: "active",
        updatedAt: new Date(),
      })
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

function mapSession(row: typeof chatSessions.$inferSelect, lastMessageContent?: string): Session {
  return {
    id: row.id,
    initiatorPersonaId: row.initiatorPersonaId,
    targetPersonaId: row.targetPersonaId,
    status: mapSessionStatus(row.status),
    currentRound: row.currentRound,
    maxRounds: row.maxRounds,
    lastMessageContent,
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
  if (status === "paused") {
    return "paused";
  }
  return "completed";
}
