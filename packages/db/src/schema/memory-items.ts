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
import { agentPersonas } from "./agent-personas.js";
import { chatSessions } from "./chat-sessions.js";

export const MEMORY_ITEM_CATEGORIES = [
  "fact",
  "preference",
  "experience",
  "instruction",
] as const;

export const MEMORY_ITEM_SOURCES = [
  "agent_inferred",
  "human_override",
  "system",
  "assessment_self_report",
  "assessment_inferred",
] as const;

export const memoryItems = pgTable(
  "memory_items",
  {
    id: varchar("id", { length: 64 }).primaryKey(),

    // 这条记忆属于哪个 persona
    personaId: varchar("persona_id", { length: 64 })
      .notNull()
      .references(() => agentPersonas.id),

    // 记忆来源会话（可选 —— 有些记忆来自用户直接设定，不关联会话）
    sessionId: varchar("session_id", { length: 64 }).references(
      () => chatSessions.id,
      { onDelete: "set null" },
    ),

    // 记忆类型
    // fact: 事实类（"她喜欢猫"）
    // preference: 偏好类（"不喜欢被催"）
    // experience: 经历类（"上次聊到旅行很开心"）
    // instruction: 用户直接下达的指令（"以后不要聊前任"）
    category: varchar("category", { length: 30 }).notNull(),

    // 记忆内容（自然语言描述）
    content: text("content").notNull(),

    // ⭐ 权重（0.0 ~ 1.0）—— 这是"可控性"的核心机制
    // AI 自动推理出的记忆权重较低（0.3~0.5）
    // 用户手动介入产生的记忆权重很高（0.8~1.0）
    // AI 生成回复时优先参考高权重记忆，从而实现"用户说了算"
    weight: real("weight").notNull().default(0.5),

    // 记忆来源：谁产生了这条记忆
    // agent_inferred: AI 从对话中自动提取
    // human_override: 用户亲自输入（最高权重！）
    // system: 系统生成（如初始化记忆）
    // assessment_self_report: 用户在测评中直接作答形成的自我陈述
    // assessment_inferred: 测评解释器基于多题结果归纳出的推断
    source: varchar("source", { length: 30 }).notNull(),

    // 向量嵌入 —— 未来用于语义搜索
    // 当 AI 需要回忆时，把当前对话转成向量，找最相关的记忆
    // 暂时 nullable，后续接入 embedding 模型后填充
    // 注意：pgvector 的 HNSW 索引会在数据量增长后添加
    embedding: jsonb("embedding").$type<number[]>(),

    // 扩展元数据（灵活存储，如提取时的上下文、置信度等）
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),

    createdBy: varchar("created_by", { length: 64 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // 最常见查询：获取某个 persona 的所有记忆（按权重排序）
    index("memory_items_persona_id_idx").on(table.personaId),

    // 来源会话的外键索引
    index("memory_items_session_id_idx").on(table.sessionId),

    // 按来源过滤（如：只看用户手动设定的记忆）
    index("memory_items_source_idx").on(table.source),

    check(
      "memory_items_category_check",
      sql`${table.category} IN ('fact', 'preference', 'experience', 'instruction')`,
    ),

    check(
      "memory_items_source_check",
      sql`${table.source} IN ('agent_inferred', 'human_override', 'system', 'assessment_self_report', 'assessment_inferred')`,
    ),

    // 权重必须在 0~1 之间
    check(
      "memory_items_weight_check",
      sql`${table.weight} >= 0 AND ${table.weight} <= 1`,
    ),
  ],
);
