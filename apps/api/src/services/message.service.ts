import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  isNull,
  lt,
  or,
} from "drizzle-orm";

import type { DbClient } from "@agent/db";
import { chatMessages, chatSessions } from "@agent/db";

import { ApiError } from "../lib/api-error.js";
import { SessionService } from "./session.service.js";
import { createId } from "../lib/id.js";
import { PairInsightService } from "./pair-insight.service.js";
import type {
  ChatMessage,
  CreateAgentMessageInput,
  CreateHumanMessageInput,
  CreateSystemMessageInput,
} from "./types.js";

interface ListMessagesInput {
  sessionId: string;
  cursor?: string | undefined;
  limit?: number | undefined;
  scope?: "session" | "pair" | undefined;
}

interface ListMessagesResult {
  items: ChatMessage[];
  total: number;
  nextCursor: string | null;
}

interface MessageCursor {
  id: string;
  createdAt: Date;
}

const DEFAULT_MESSAGE_PAGE_LIMIT = 30;

export class MessageService {
  constructor(
    private readonly db: DbClient,
    private readonly sessionService: SessionService,
    private readonly pairInsightService: PairInsightService,
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

    const created = await this.createMessage({
      sessionId: input.sessionId,
      authorPersonaId: input.authorPersonaId,
      content: input.content,
      role: "human",
    });

    await this.sessionService.updateStatus(input.sessionId, "active");
    await this.pairInsightService.syncBySession(input.sessionId);
    return created;
  }

  async createAgentMessage(input: CreateAgentMessageInput): Promise<ChatMessage> {
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

    const created = await this.createMessage({
      sessionId: input.sessionId,
      authorPersonaId: input.authorPersonaId,
      content: input.content,
      role: "agent",
      metadata: input.metadata,
    });

    await this.sessionService.updateStatus(input.sessionId, "active");
    await this.pairInsightService.syncBySession(input.sessionId);
    return created;
  }

  async createSystemMessage(input: CreateSystemMessageInput): Promise<ChatMessage> {
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

    return this.createMessage({
      sessionId: input.sessionId,
      authorPersonaId: input.authorPersonaId,
      content: input.content,
      role: "system",
      metadata: input.metadata,
    });
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

  async listBySessionWindow(input: ListMessagesInput): Promise<ListMessagesResult> {
    const limit = input.limit ?? DEFAULT_MESSAGE_PAGE_LIMIT;
    const scope = input.scope ?? "session";
    const cursor = parseMessageCursor(input.cursor);

    const sessionIds = await this.resolveSessionIdsForScope(input.sessionId, scope);
    if (sessionIds.length === 0) {
      return {
        items: [],
        total: 0,
        nextCursor: null,
      };
    }

    const baseCondition = inArray(chatMessages.sessionId, sessionIds);
    const cursorCondition = cursor
      ? or(
          lt(chatMessages.createdAt, cursor.createdAt),
          and(
            eq(chatMessages.createdAt, cursor.createdAt),
            lt(chatMessages.id, cursor.id),
          ),
        )
      : undefined;

    const countRows = await this.db
      .select({ total: count() })
      .from(chatMessages)
      .where(baseCondition);
    const total = Number(countRows[0]?.total ?? 0);

    const rows = await this.db
      .select()
      .from(chatMessages)
      .where(cursorCondition ? and(baseCondition, cursorCondition) : baseCondition)
      .orderBy(desc(chatMessages.createdAt), desc(chatMessages.id))
      .limit(limit + 1);

    const hasNext = rows.length > limit;
    const pageRows = hasNext ? rows.slice(0, limit) : rows;
    const nextCursor = hasNext
      ? encodeMessageCursor(pageRows[pageRows.length - 1]!)
      : null;

    return {
      items: pageRows.map(mapMessage).reverse(),
      total,
      nextCursor,
    };
  }

  private async createMessage(input: {
    sessionId: string;
    authorPersonaId: string;
    role: "human" | "agent" | "system";
    content: string;
    metadata?: Record<string, unknown> | undefined;
  }): Promise<ChatMessage> {
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
        role: input.role,
        content: input.content,
        metadata: input.metadata,
        round,
      })
      .returning();

    return mapMessage(createdRows[0]!);
  }

  private async resolveSessionIdsForScope(
    sessionId: string,
    scope: "session" | "pair",
  ): Promise<string[]> {
    const sessionRows = await this.db
      .select({
        id: chatSessions.id,
        initiatorPersonaId: chatSessions.initiatorPersonaId,
        targetPersonaId: chatSessions.targetPersonaId,
      })
      .from(chatSessions)
      .where(and(eq(chatSessions.id, sessionId), isNull(chatSessions.deletedAt)))
      .limit(1);
    const session = sessionRows[0];
    if (!session) {
      throw new ApiError(404, "SESSION_NOT_FOUND", `Session not found: ${sessionId}`);
    }

    if (scope === "session") {
      return [session.id];
    }

    const pairSessionRows = await this.db
      .select({ id: chatSessions.id })
      .from(chatSessions)
      .where(
        and(
          isNull(chatSessions.deletedAt),
          or(
            and(
              eq(chatSessions.initiatorPersonaId, session.initiatorPersonaId),
              eq(chatSessions.targetPersonaId, session.targetPersonaId),
            ),
            and(
              eq(chatSessions.initiatorPersonaId, session.targetPersonaId),
              eq(chatSessions.targetPersonaId, session.initiatorPersonaId),
            ),
          )!,
        ),
      );

    return pairSessionRows.map((row) => row.id);
  }
}

function mapMessage(row: typeof chatMessages.$inferSelect): ChatMessage {
  return {
    id: row.id,
    sessionId: row.sessionId,
    authorPersonaId: row.senderPersonaId,
    role: mapMessageRole(row.role),
    content: row.content,
    metadata: row.metadata ?? undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

function mapMessageRole(role: string): ChatMessage["role"] {
  if (role === "agent" || role === "human" || role === "system") {
    return role;
  }
  return "system";
}

function parseMessageCursor(cursor: string | undefined): MessageCursor | null {
  if (!cursor) {
    return null;
  }

  try {
    const decoded = Buffer.from(cursor, "base64url").toString("utf8");
    const parsed = JSON.parse(decoded) as {
      id?: string;
      createdAt?: string;
    };
    if (!parsed.id || !parsed.createdAt) {
      throw new Error("Missing cursor fields.");
    }

    const createdAt = new Date(parsed.createdAt);
    if (Number.isNaN(createdAt.getTime())) {
      throw new Error("Invalid cursor timestamp.");
    }

    return {
      id: parsed.id,
      createdAt,
    };
  } catch {
    throw new ApiError(400, "VALIDATION_ERROR", "Invalid cursor.");
  }
}

function encodeMessageCursor(row: typeof chatMessages.$inferSelect): string {
  const payload = JSON.stringify({
    id: row.id,
    createdAt: row.createdAt.toISOString(),
  });
  return Buffer.from(payload, "utf8").toString("base64url");
}
