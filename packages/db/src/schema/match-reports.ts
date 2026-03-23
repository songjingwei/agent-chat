import {
  pgTable,
  varchar,
  text,
  real,
  timestamp,
  jsonb,
  index,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { chatSessions } from "./chat-sessions.js";

export const matchReports = pgTable(
  "match_reports",
  {
    id: varchar("id", { length: 64 }).primaryKey(),

    // 基于哪个会话生成的报告
    sessionId: varchar("session_id", { length: 64 })
      .notNull()
      .references(() => chatSessions.id),

    // 报告状态
    // pending: 会话结束，等待 AI 生成报告
    // generating: AI 正在分析对话并生成报告
    // completed: 报告生成完毕
    // failed: 生成失败（如 AI API 超时）
    status: varchar("status", { length: 20 }).notNull().default("pending"),

    // 兼容性评分（0.0 ~ 1.0）—— AI 根据对话分析双方的匹配程度
    compatibilityScore: real("compatibility_score"),

    // AI 生成的总结 —— 用自然语言描述这次对话的亮点和问题
    summary: text("summary"),

    // 推荐理由 —— 为什么推荐/不推荐继续交流
    recommendation: text("recommendation"),

    // 结构化分析数据
    // 如：{ "commonInterests": ["旅行", "猫"], "conflictPoints": ["作息不同"], "conversationQuality": 0.8 }
    analysisData: jsonb("analysis_data").$type<Record<string, unknown>>(),

    createdBy: varchar("created_by", { length: 64 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("match_reports_session_id_idx").on(table.sessionId),

    check(
      "match_reports_status_check",
      sql`${table.status} IN ('pending', 'generating', 'completed', 'failed')`,
    ),

    check(
      "match_reports_score_check",
      sql`${table.compatibilityScore} IS NULL OR (${table.compatibilityScore} >= 0 AND ${table.compatibilityScore} <= 1)`,
    ),
  ],
);
