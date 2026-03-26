import {
  pgTable,
  varchar,
  text,
  real,
  integer,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { agentPersonas } from "./agent-personas.js";
import { chatSessions } from "./chat-sessions.js";

export const personaPairInsights = pgTable(
  "persona_pair_insights",
  {
    id: varchar("id", { length: 64 }).primaryKey(),

    // 规范化后的 pair key：较小的 persona id 永远在 low，保证一对关系只存一条
    personaLowId: varchar("persona_low_id", { length: 64 })
      .notNull()
      .references(() => agentPersonas.id),

    personaHighId: varchar("persona_high_id", { length: 64 })
      .notNull()
      .references(() => agentPersonas.id),

    // 最近一次贡献这份关系摘要的会话
    lastSessionId: varchar("last_session_id", { length: 64 })
      .references(() => chatSessions.id, { onDelete: "set null" }),

    // 历史互动强度
    sessionCount: integer("session_count").notNull().default(0),
    messageCount: integer("message_count").notNull().default(0),

    // 好感度与置信度都规范到 0~1，前端更容易直接展示
    mutualScore: real("mutual_score").notNull(),
    confidence: real("confidence").notNull(),

    // 用于广场小标记和一行摘要
    affinityLabel: varchar("affinity_label", { length: 32 }).notNull(),
    summaryShort: text("summary_short").notNull(),

    lastInteractedAt: timestamp("last_interacted_at", { withTimezone: true })
      .notNull(),
    analysisData: jsonb("analysis_data").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("persona_pair_insights_pair_idx").on(
      table.personaLowId,
      table.personaHighId,
    ),
    index("persona_pair_insights_persona_low_id_idx").on(table.personaLowId),
    index("persona_pair_insights_persona_high_id_idx").on(table.personaHighId),
    index("persona_pair_insights_last_interacted_at_idx").on(
      table.lastInteractedAt,
    ),
    check(
      "persona_pair_insights_pair_order_check",
      sql`${table.personaLowId} < ${table.personaHighId}`,
    ),
    check(
      "persona_pair_insights_session_count_check",
      sql`${table.sessionCount} >= 0`,
    ),
    check(
      "persona_pair_insights_message_count_check",
      sql`${table.messageCount} >= 0`,
    ),
    check(
      "persona_pair_insights_mutual_score_check",
      sql`${table.mutualScore} >= 0 AND ${table.mutualScore} <= 1`,
    ),
    check(
      "persona_pair_insights_confidence_check",
      sql`${table.confidence} >= 0 AND ${table.confidence} <= 1`,
    ),
  ],
);
