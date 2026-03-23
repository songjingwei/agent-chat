import { asc, count, eq } from "drizzle-orm";

import type { DbClient } from "@agent/db";
import { chatMessages } from "@agent/db";

import { ApiError } from "../lib/api-error.js";
import { SessionService } from "./session.service.js";
import { createId } from "../lib/id.js";
import type { ChatMessage, CreateHumanMessageInput } from "./types.js";

export class MessageService {
  constructor(
    private readonly db: DbClient,
    private readonly sessionService: SessionService,
  ) {}

  async createHumanMessage(input: CreateHumanMessageInput): Promise<ChatMessage> {
    const session = await this.sessionService.getById(input.sessionId);
    if (!session) {
      throw new ApiError(404, "SESSION_NOT_FOUND", `Session not found: ${input.sessionId}`);
    }

    const isParticipant =
      session.initiatorPersonaId === input.authorPersonaId ||
      session.targetPersonaId === input.authorPersonaId;

    if (!isParticipant) {
      throw new ApiError(
        400,
        "INVALID_AUTHOR",
        "authorPersonaId must belong to session participants.",
      );
    }

    const countRows = await this.db
      .select({ total: count() })
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, input.sessionId));
    const round = Number(countRows[0]?.total ?? 0) + 1;

    const createdRows = await this.db
      .insert(chatMessages)
      .values({
        id: createId("msg"),
        sessionId: input.sessionId,
        senderPersonaId: input.authorPersonaId,
        role: "human",
        content: input.content,
        round,
      })
      .returning();

    await this.sessionService.updateStatus(input.sessionId, "active");
    return mapMessage(createdRows[0]!);
  }

  async listBySession(sessionId: string): Promise<ChatMessage[]> {
    const session = await this.sessionService.getById(sessionId);
    if (!session) {
      throw new ApiError(404, "SESSION_NOT_FOUND", `Session not found: ${sessionId}`);
    }

    const rows = await this.db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
      .orderBy(asc(chatMessages.createdAt));
    return rows.map(mapMessage);
  }
}

function mapMessage(row: typeof chatMessages.$inferSelect): ChatMessage {
  return {
    id: row.id,
    sessionId: row.sessionId,
    authorPersonaId: row.senderPersonaId,
    role: mapMessageRole(row.role),
    content: row.content,
    createdAt: row.createdAt.toISOString(),
  };
}

function mapMessageRole(role: string): ChatMessage["role"] {
  if (role === "agent" || role === "human" || role === "system") {
    return role;
  }
  return "system";
}
