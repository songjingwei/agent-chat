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
import { users } from "./users.js";

export const agentPersonas = pgTable(
  "agent_personas",
  {
    // usr_a1b2c3 格式的主键，一眼就知道是 persona
    id: varchar("id", { length: 64 }).primaryKey(),

    // 这个 persona 属于哪个用户 —— 每个用户可以有多个 AI 人设
    userId: varchar("user_id", { length: 64 })
      .notNull()
      .references(() => users.id),

    // 人设的名字，比如"温柔学姐"、"理性工程师"
    name: varchar("name", { length: 100 }).notNull(),

    // 人设的自我介绍/简介
    bio: text("bio"),

    // 人设的系统提示词 —— 告诉 AI "你是谁、你的性格、说话风格"
    // 这是让 AI "像本人"的核心字段
    systemPrompt: text("system_prompt"),

    // 性格特质标签，如 ["幽默", "理性", "温暖"]
    // 用 jsonb 存数组，方便查询和索引
    traits: jsonb("traits").$type<string[]>().default([]),

    // 版本号 —— 每次修改人设都递增
    // 这样可以追踪人设的演变过程，比如用户调整了性格后效果更好，可以回溯
    version: integer("version").notNull().default(1),

    // 人设状态：draft(草稿) → active(使用中) → archived(归档)
    status: varchar("status", { length: 20 }).notNull().default("draft"),

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
    // 外键列必须有索引 —— PG 不会自动建，没索引的话 JOIN 查询会全表扫描，很慢
    index("agent_personas_user_id_idx").on(table.userId),

    // 用 CHECK 约束代替 PG ENUM
    // PG ENUM 一旦建了很难改（加值容易，删值/改名极痛苦，要重建类型）
    // varchar + CHECK 则可以通过简单的迁移来增减合法值
    check(
      "agent_personas_status_check",
      sql`${table.status} IN ('draft', 'active', 'archived')`,
    ),
  ],
);
