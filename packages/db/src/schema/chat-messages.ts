import {
  pgTable,
  varchar,
  text,
  integer,
  timestamp,
  jsonb,
  index,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { chatSessions } from "./chat-sessions.js";
import { agentPersonas } from "./agent-personas.js";

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: varchar("id", { length: 64 }).primaryKey(),

    // 属于哪个会话 —— CASCADE: 删会话时自动删所有消息
    sessionId: varchar("session_id", { length: 64 })
      .notNull()
      .references(() => chatSessions.id, { onDelete: "cascade" }),

    // 谁发的这条消息（哪个 persona）
    senderPersonaId: varchar("sender_persona_id", { length: 64 })
      .notNull()
      .references(() => agentPersonas.id),

    // 消息类型
    // agent: AI 自动生成的消息
    // human: 用户手动介入发送的消息（高权重！会改变 AI 后续行为）
    // system: 系统消息（如"会话已暂停"）
    role: varchar("role", { length: 20 }).notNull(),

    // 消息正文
    content: text("content").notNull(),

    // 第几轮对话的消息 —— 方便按轮次回放
    round: integer("round").notNull().default(0),

    // AI 生成消息时的元数据，如使用的模型、token 消耗、推理延迟等
    // 用 jsonb 灵活存储，不同模型返回的元数据格式可能不同
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // 最常见查询：获取某个会话的所有消息（按时间排序）
    // 复合索引 (session_id, created_at) 完美匹配这个查询模式
    index("chat_messages_session_id_created_at_idx").on(
      table.sessionId,
      table.createdAt,
    ),

    index("chat_messages_sender_persona_id_idx").on(table.senderPersonaId),

    check(
      "chat_messages_role_check",
      sql`${table.role} IN ('agent', 'human', 'system')`,
    ),
  ],
);
