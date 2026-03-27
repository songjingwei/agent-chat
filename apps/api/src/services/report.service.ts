import { and, asc, desc, eq, isNull, or } from "drizzle-orm";

import type { DbClient } from "@agent/db";
import { agentPersonas, chatMessages, chatSessions, matchReports } from "@agent/db";

import { ApiError } from "../lib/api-error.js";
import type { LatestReport, Session } from "./types.js";

export class ReportService {
  constructor(private readonly db: DbClient) {}

  async getLatestByPersona(personaId: string): Promise<LatestReport | null> {
    const personaRows = await this.db
      .select({ id: agentPersonas.id })
      .from(agentPersonas)
      .where(and(eq(agentPersonas.id, personaId), isNull(agentPersonas.deletedAt)))
      .limit(1);
    if (personaRows.length === 0) {
      throw new ApiError(404, "PERSONA_NOT_FOUND", `Persona not found: ${personaId}`);
    }

    const sessions = await this.findSessionsByPersona(personaId);
    if (sessions.length === 0) {
      return null;
    }

    const latestSession = sessions
      .sort((a, b) => {
        return b.updatedAt.localeCompare(a.updatedAt);
      })
      .at(0);

    if (!latestSession) {
      return null;
    }

    const messages = await this.db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, latestSession.id))
      .orderBy(asc(chatMessages.createdAt));
    const latestMessage = messages.at(-1);

    const reportRows = await this.db
      .select()
      .from(matchReports)
      .where(eq(matchReports.sessionId, latestSession.id))
      .orderBy(desc(matchReports.updatedAt))
      .limit(1);
    const latestReport = reportRows[0];

    const recommendation = latestReport?.recommendation
      ?? (
        messages.length > 0
          ? "可以继续观察互动质量并安排下一轮对话。"
          : "建议先发送一条人工介入消息，补充高权重偏好信息。"
      );
    const rationale = latestReport?.summary
      ?? (
        messages.length > 0
          ? "该会话已有人工输入样本，可据此继续评估沟通节奏。"
          : "当前会话还没有人工输入，画像可控性信号不足。"
      );

    return {
      personaId,
      sessionId: latestSession.id,
      generatedAt: latestReport?.updatedAt.toISOString() ?? new Date().toISOString(),
      sessionStatus: latestSession.status,
      totalMessages: messages.length,
      latestMessagePreview: latestMessage ? latestMessage.content.slice(0, 80) : null,
      recommendation,
      rationale,
    };
  }

  private async findSessionsByPersona(personaId: string): Promise<Session[]> {
    const rows = await this.db
      .select()
      .from(chatSessions)
      .where(
        and(
          isNull(chatSessions.deletedAt),
          or(
            eq(chatSessions.initiatorPersonaId, personaId),
            eq(chatSessions.targetPersonaId, personaId),
          ),
        ),
      );
    return rows.map(mapSession);
  }
}

function mapSession(row: typeof chatSessions.$inferSelect): Session {
  return {
    id: row.id,
    initiatorPersonaId: row.initiatorPersonaId,
    targetPersonaId: row.targetPersonaId,
    status: mapSessionStatus(row.status),
    currentRound: row.currentRound,
    maxRounds: row.maxRounds,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapSessionStatus(status: string): Session["status"] {
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
