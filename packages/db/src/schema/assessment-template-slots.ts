import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { assessmentTemplates } from "./assessment-templates.js";

export const assessmentTemplateSlots = pgTable(
  "assessment_template_slots",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    templateId: varchar("template_id", { length: 64 })
      .notNull()
      .references(() => assessmentTemplates.id, { onDelete: "cascade" }),
    slotIndex: integer("slot_index").notNull(),
    dimension: varchar("dimension", { length: 50 }).notNull(),
    requiredTags: jsonb("required_tags").$type<string[]>().default([]),
    excludedTags: jsonb("excluded_tags").$type<string[]>().default([]),
    difficulty: varchar("difficulty", { length: 20 }),
    answerType: varchar("answer_type", { length: 20 }).notNull().default("single_choice"),
    randomPoolLimit: integer("random_pool_limit"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("assessment_template_slots_template_id_slot_index_idx").on(
      table.templateId,
      table.slotIndex,
    ),
    index("assessment_template_slots_template_id_idx").on(table.templateId),
    index("assessment_template_slots_template_id_dimension_idx").on(
      table.templateId,
      table.dimension,
    ),
    check(
      "assessment_template_slots_answer_type_check",
      sql`${table.answerType} IN ('single_choice', 'likert', 'free_text')`,
    ),
    check(
      "assessment_template_slots_difficulty_check",
      sql`${table.difficulty} IS NULL OR ${table.difficulty} IN ('low', 'medium', 'high')`,
    ),
  ],
);
