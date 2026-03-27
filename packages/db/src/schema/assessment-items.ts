import {
  check,
  index,
  jsonb,
  pgTable,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { assessmentItemCandidates, type AssessmentItemCandidateOption } from "./assessment-item-candidates.js";

export const ASSESSMENT_ITEM_STATUSES = [
  "draft",
  "active",
  "archived",
] as const;

export const ASSESSMENT_ANSWER_TYPES = [
  "single_choice",
  "likert",
  "free_text",
] as const;

export const ASSESSMENT_DIFFICULTIES = [
  "low",
  "medium",
  "high",
] as const;

export const assessmentItems = pgTable(
  "assessment_items",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    candidateId: varchar("candidate_id", { length: 64 }).references(
      () => assessmentItemCandidates.id,
      { onDelete: "set null" },
    ),
    slug: varchar("slug", { length: 120 }).notNull(),
    framework: varchar("framework", { length: 50 }).notNull(),
    dimension: varchar("dimension", { length: 50 }).notNull(),
    subdimension: varchar("subdimension", { length: 50 }),
    questionText: varchar("question_text", { length: 4000 }).notNull(),
    optionsJson: jsonb("options_json").$type<AssessmentItemCandidateOption[]>().default([]),
    answerType: varchar("answer_type", { length: 20 }).notNull(),
    difficulty: varchar("difficulty", { length: 20 }).notNull().default("medium"),
    tags: jsonb("tags").$type<string[]>().default([]),
    language: varchar("language", { length: 20 }).notNull().default("zh-CN"),
    sourceUrl: varchar("source_url", { length: 1000 }),
    sourceTitle: varchar("source_title", { length: 255 }),
    licenseNote: varchar("license_note", { length: 500 }),
    status: varchar("status", { length: 20 }).notNull().default("draft"),
    createdBy: varchar("created_by", { length: 64 }),
    updatedBy: varchar("updated_by", { length: 64 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("assessment_items_slug_idx").on(table.slug),
    index("assessment_items_status_framework_dimension_idx").on(
      table.status,
      table.framework,
      table.dimension,
    ),
    index("assessment_items_candidate_id_idx").on(table.candidateId),
    index("assessment_items_created_at_idx").on(table.createdAt),
    check(
      "assessment_items_status_check",
      sql`${table.status} IN ('draft', 'active', 'archived')`,
    ),
    check(
      "assessment_items_answer_type_check",
      sql`${table.answerType} IN ('single_choice', 'likert', 'free_text')`,
    ),
    check(
      "assessment_items_difficulty_check",
      sql`${table.difficulty} IN ('low', 'medium', 'high')`,
    ),
  ],
);
