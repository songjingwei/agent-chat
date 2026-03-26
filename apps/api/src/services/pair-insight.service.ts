import {
  and,
  asc,
  desc,
  eq,
  inArray,
  isNull,
  ne,
  or,
  sql,
} from "drizzle-orm";

import type { DbClient } from "@agent/db";
import {
  chatMessages,
  chatSessions,
  matchReports,
  personaPairInsights,
} from "@agent/db";

import { createId } from "../lib/id.js";
import type { PersonaRelationship } from "./types.js";

const canonicalizePair = (personaAId: string, personaBId: string) => {
  return personaAId < personaBId
    ? { lowId: personaAId, highId: personaBId }
    : { lowId: personaBId, highId: personaAId };
};

const clamp01 = (value: number) => {
  return Math.min(1, Math.max(0, value));
};

const roundScore = (value: number) => {
  return Number(value.toFixed(3));
};

const buildAffinityCopy = (input: {
  mutualScore: number;
  confidence: number;
  sessionCount: number;
  messageCount: number;
  reportScore: number | null;
}) => {
  if (input.messageCount <= 2) {
    return {
      affinityLabel: "初有回响",
      summaryShort: `你们刚留下第一段对话，共 ${input.messageCount} 条消息，还在轻轻试探彼此。`,
    };
  }

  if (input.mutualScore >= 0.78 && input.confidence >= 0.55) {
    return {
      affinityLabel: "颇有默契",
      summaryShort: `你们已聊 ${input.sessionCount} 次，共 ${input.messageCount} 条消息，来回节奏自然，明显越聊越顺。`,
    };
  }

  if (input.mutualScore >= 0.62) {
    return {
      affinityLabel: "渐生好感",
      summaryShort:
        input.reportScore !== null
          ? `历史总结偏积极。你们已聊 ${input.sessionCount} 次，彼此都愿意继续接话。`
          : `你们已聊 ${input.sessionCount} 次，共 ${input.messageCount} 条消息，互动稳定，正在慢慢熟悉。`,
    };
  }

  if (input.mutualScore >= 0.45) {
    return {
      affinityLabel: "还在观察",
      summaryShort: `你们已有 ${input.messageCount} 条历史消息，气氛不生硬，但还在慢慢摸索彼此的节奏。`,
    };
  }

  return {
    affinityLabel: "回响微弱",
    summaryShort: `你们聊过 ${input.sessionCount} 次，但互动还比较浅，也许还需要新的话题打开局面。`,
  };
};

export class PairInsightService {
  constructor(private readonly db: DbClient) {}

  async listViewerRelationships(
    viewerPersonaId: string,
    options: {
      limit?: number;
    } = {},
  ): Promise<{
    items: Array<{
      personaId: string;
      relationship: PersonaRelationship;
    }>;
    total: number;
  }> {
    const whereClause = or(
      eq(personaPairInsights.personaLowId, viewerPersonaId),
      eq(personaPairInsights.personaHighId, viewerPersonaId),
    )!;
    const totalRows = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(personaPairInsights)
      .where(whereClause);

    const limit =
      options.limit === undefined
        ? undefined
        : Math.min(Math.max(options.limit, 1), 50);
    const baseQuery = this.db
      .select()
      .from(personaPairInsights)
      .where(whereClause)
      .orderBy(
        desc(personaPairInsights.mutualScore),
        desc(personaPairInsights.lastInteractedAt),
        desc(personaPairInsights.updatedAt),
      );
    const rows = limit === undefined ? await baseQuery : await baseQuery.limit(limit);

    return {
      items: rows.map((row) => mapViewerRelationship(viewerPersonaId, row)),
      total: totalRows[0]?.count ?? 0,
    };
  }

  async listCounterpartIdsForViewer(viewerPersonaId: string): Promise<string[]> {
    const result = await this.listViewerRelationships(viewerPersonaId);
    return result.items.map((item) => item.personaId);
  }

  async syncBySession(sessionId: string): Promise<void> {
    const rows = await this.db
      .select({
        initiatorPersonaId: chatSessions.initiatorPersonaId,
        targetPersonaId: chatSessions.targetPersonaId,
      })
      .from(chatSessions)
      .where(and(eq(chatSessions.id, sessionId), isNull(chatSessions.deletedAt)))
      .limit(1);
    const session = rows[0];
    if (!session) {
      return;
    }

    await this.syncByPair(session.initiatorPersonaId, session.targetPersonaId);
  }

  async syncByPair(personaAId: string, personaBId: string): Promise<void> {
    if (personaAId === personaBId) {
      return;
    }

    const pair = canonicalizePair(personaAId, personaBId);
    const insight = await this.buildInsight(pair.lowId, pair.highId);

    if (!insight) {
      await this.db
        .delete(personaPairInsights)
        .where(
          and(
            eq(personaPairInsights.personaLowId, pair.lowId),
            eq(personaPairInsights.personaHighId, pair.highId),
          ),
        );
      return;
    }

    const now = new Date();
    await this.db
      .insert(personaPairInsights)
      .values({
        id: createId("pin"),
        personaLowId: pair.lowId,
        personaHighId: pair.highId,
        ...insight,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [
          personaPairInsights.personaLowId,
          personaPairInsights.personaHighId,
        ],
        set: {
          lastSessionId: insight.lastSessionId,
          sessionCount: insight.sessionCount,
          messageCount: insight.messageCount,
          mutualScore: insight.mutualScore,
          confidence: insight.confidence,
          affinityLabel: insight.affinityLabel,
          summaryShort: insight.summaryShort,
          lastInteractedAt: insight.lastInteractedAt,
          analysisData: insight.analysisData,
          updatedAt: now,
        },
      });
  }

  async listForViewer(
    viewerPersonaId: string,
    targetPersonaIds: string[],
  ): Promise<Map<string, PersonaRelationship>> {
    const uniqueTargetIds = [...new Set(targetPersonaIds)].filter((id) => {
      return id !== viewerPersonaId;
    });

    if (uniqueTargetIds.length === 0) {
      return new Map();
    }

    const existingRows = await this.queryExistingRows(viewerPersonaId, uniqueTargetIds);
    const coveredTargetIds = new Set(
      existingRows.map((row) => {
        return row.personaLowId === viewerPersonaId
          ? row.personaHighId
          : row.personaLowId;
      }),
    );
    const missingTargetIds = uniqueTargetIds.filter((id) => {
      return !coveredTargetIds.has(id);
    });

    if (missingTargetIds.length > 0) {
      await Promise.all(
        missingTargetIds.map((targetPersonaId) => {
          return this.syncByPair(viewerPersonaId, targetPersonaId);
        }),
      );
    }

    const rows =
      missingTargetIds.length > 0
        ? await this.queryExistingRows(viewerPersonaId, uniqueTargetIds)
        : existingRows;

    return new Map(
      rows.map((row) => {
        const counterpartPersonaId =
          row.personaLowId === viewerPersonaId
            ? row.personaHighId
            : row.personaLowId;
        return [counterpartPersonaId, mapRelationship(row)];
      }),
    );
  }

  private async queryExistingRows(
    viewerPersonaId: string,
    targetPersonaIds: string[],
  ) {
    if (targetPersonaIds.length === 0) {
      return [];
    }

    return this.db
      .select()
      .from(personaPairInsights)
      .where(
        or(
          and(
            eq(personaPairInsights.personaLowId, viewerPersonaId),
            inArray(personaPairInsights.personaHighId, targetPersonaIds),
          ),
          and(
            eq(personaPairInsights.personaHighId, viewerPersonaId),
            inArray(personaPairInsights.personaLowId, targetPersonaIds),
          ),
        )!,
      );
  }

  private async buildInsight(personaLowId: string, personaHighId: string) {
    const sessions = await this.db
      .select({
        id: chatSessions.id,
      })
      .from(chatSessions)
      .where(
        and(
          isNull(chatSessions.deletedAt),
          or(
            and(
              eq(chatSessions.initiatorPersonaId, personaLowId),
              eq(chatSessions.targetPersonaId, personaHighId),
            ),
            and(
              eq(chatSessions.initiatorPersonaId, personaHighId),
              eq(chatSessions.targetPersonaId, personaLowId),
            ),
          )!,
        ),
      );

    if (sessions.length === 0) {
      return null;
    }

    const sessionIds = sessions.map((session) => session.id);
    const conversationalMessages = await this.db
      .select({
        sessionId: chatMessages.sessionId,
        senderPersonaId: chatMessages.senderPersonaId,
        content: chatMessages.content,
        createdAt: chatMessages.createdAt,
      })
      .from(chatMessages)
      .where(
        and(
          inArray(chatMessages.sessionId, sessionIds),
          ne(chatMessages.role, "system"),
        ),
      )
      .orderBy(asc(chatMessages.createdAt));

    if (conversationalMessages.length === 0) {
      return null;
    }

    const reportRows = await this.db
      .select({
        compatibilityScore: matchReports.compatibilityScore,
      })
      .from(matchReports)
      .where(inArray(matchReports.sessionId, sessionIds));

    const sessionIdsWithMessages = new Set(
      conversationalMessages.map((message) => message.sessionId),
    );
    const lowSideMessageCount = conversationalMessages.filter((message) => {
      return message.senderPersonaId === personaLowId;
    }).length;
    const highSideMessageCount = conversationalMessages.length - lowSideMessageCount;
    const lastMessage = conversationalMessages[conversationalMessages.length - 1]!;
    const reportScores = reportRows
      .map((row) => row.compatibilityScore)
      .filter((value): value is number => value !== null);

    const depthScore = clamp01(conversationalMessages.length / 14);
    const repeatScore = clamp01(sessionIdsWithMessages.size / 4);
    const balanceScore = clamp01(
      1 -
        Math.abs(lowSideMessageCount - highSideMessageCount) /
          conversationalMessages.length,
    );
    const heuristicScore = clamp01(
      0.52 * depthScore + 0.2 * repeatScore + 0.28 * balanceScore,
    );
    const reportScore =
      reportScores.length > 0
        ? reportScores.reduce((sum, value) => sum + value, 0) / reportScores.length
        : null;
    const mutualScore = roundScore(
      reportScore === null
        ? heuristicScore
        : clamp01(reportScore * 0.72 + heuristicScore * 0.28),
    );
    const confidence = roundScore(
      clamp01(
        0.58 * depthScore +
          0.24 * repeatScore +
          0.18 * (reportScore === null ? 0 : 1),
      ),
    );
    const copy = buildAffinityCopy({
      mutualScore,
      confidence,
      sessionCount: sessionIdsWithMessages.size,
      messageCount: conversationalMessages.length,
      reportScore,
    });

    return {
      lastSessionId: lastMessage.sessionId,
      sessionCount: sessionIdsWithMessages.size,
      messageCount: conversationalMessages.length,
      mutualScore,
      confidence,
      affinityLabel: copy.affinityLabel,
      summaryShort: copy.summaryShort,
      lastInteractedAt: lastMessage.createdAt,
      analysisData: {
        scoreSource: reportScore === null ? "heuristic" : "hybrid",
        heuristicScore: roundScore(heuristicScore),
        reportScore: reportScore === null ? null : roundScore(reportScore),
        balanceScore: roundScore(balanceScore),
        depthScore: roundScore(depthScore),
        repeatScore: roundScore(repeatScore),
        lowSideMessageCount,
        highSideMessageCount,
      },
    };
  }
}

function mapRelationship(
  row: typeof personaPairInsights.$inferSelect,
): PersonaRelationship {
  return {
    hasHistory: true,
    sessionCount: row.sessionCount,
    messageCount: row.messageCount,
    mutualScore: row.mutualScore,
    confidence: row.confidence,
    affinityLabel: row.affinityLabel,
    summaryShort: row.summaryShort,
    lastInteractedAt: row.lastInteractedAt.toISOString(),
    lastSessionId: row.lastSessionId ?? null,
  };
}

function mapViewerRelationship(
  viewerPersonaId: string,
  row: typeof personaPairInsights.$inferSelect,
): {
  personaId: string;
  relationship: PersonaRelationship;
} {
  return {
    personaId:
      row.personaLowId === viewerPersonaId ? row.personaHighId : row.personaLowId,
    relationship: mapRelationship(row),
  };
}
