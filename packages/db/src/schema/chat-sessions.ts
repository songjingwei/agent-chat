import {
  pgTable,
  varchar,
  integer,
  timestamp,
  index,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { agentPersonas } from "./agent-personas.js";

export const chatSessions = pgTable(
  "chat_sessions",
  {
    id: varchar("id", { length: 64 }).primaryKey(),

    // 发起方 persona —— 谁发起了这次对话
    initiatorPersonaId: varchar("initiator_persona_id", { length: 64 })
      .notNull()
      .references(() => agentPersonas.id),

    // 接收方 persona —— 和谁对话
    targetPersonaId: varchar("target_persona_id", { length: 64 })
      .notNull()
      .references(() => agentPersonas.id),

    // 会话状态
    // pending: 刚创建等待开始
    // active: AI 正在对话中
    // paused: 用户暂停了对话（比如想审查一下再继续）
    // completed: 正常结束（达到最大轮次或自然结束）
    // failed: 出错中断
    status: varchar("status", { length: 20 }).notNull().default("pending"),

    // 当前已进行的对话轮次 —— 方便控制"最多聊 N 轮就停"
    currentRound: integer("current_round").notNull().default(0),

    // 最大允许轮次 —— 安全阀门，防止 AI 无限聊下去烧钱
    maxRounds: integer("max_rounds").notNull().default(20),

    // 审计字段
    createdBy: varchar("created_by", { length: 64 }),
    updatedBy: varchar("updated_by", { length: 64 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    // 两个外键列都要建索引
    // 场景：查"我的人设参与了哪些会话"，没索引就要扫全表
    index("chat_sessions_initiator_persona_id_idx").on(
      table.initiatorPersonaId,
    ),
    index("chat_sessions_target_persona_id_idx").on(table.targetPersonaId),

    check(
      "chat_sessions_status_check",
      sql`${table.status} IN ('pending', 'active', 'paused', 'completed', 'failed')`,
    ),
  ],
);
