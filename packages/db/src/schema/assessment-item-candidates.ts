import {
  check,
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { assessmentIngestBatches } from "./assessment-ingest-batches.js";

export const ASSESSMENT_ITEM_CANDIDATE_STATUSES = [
  "pending",
  "approved",
  "rejected",
] as const;

export type AssessmentItemCandidateOption = {
  label: string;
  value: string;
  dimension?: string;
  score?: number;
};

export const assessmentItemCandidates = pgTable(
  "assessment_item_candidates",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    ingestBatchId: varchar("ingest_batch_id", { length: 64 })
      .notNull()
      .references(() => assessmentIngestBatches.id),
    sourceUrl: varchar("source_url", { length: 1000 }),
    sourceTitle: varchar("source_title", { length: 255 }),
    copyrightNote: varchar("copyright_note", { length: 500 }),
    framework: varchar("framework", { length: 50 }).notNull(),
    dimension: varchar("dimension", { length: 50 }).notNull(),
    questionText: varchar("question_text", { length: 4000 }).notNull(),
    optionsJson: jsonb("options_json").$type<AssessmentItemCandidateOption[]>().default([]),
    explanationJson: jsonb("explanation_json").$type<Record<string, unknown>>(),
    language: varchar("language", { length: 20 }).notNull().default("zh-CN"),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    reviewNote: varchar("review_note", { length: 1000 }),
    reviewedBy: varchar("reviewed_by", { length: 64 }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("assessment_item_candidates_ingest_batch_id_idx").on(
      table.ingestBatchId,
    ),
    index("assessment_item_candidates_status_framework_dimension_idx").on(
      table.status,
      table.framework,
      table.dimension,
    ),
    index("assessment_item_candidates_reviewed_at_idx").on(table.reviewedAt),
    check(
      "assessment_item_candidates_status_check",
      sql`${table.status} IN ('pending', 'approved', 'rejected')`,
    ),
  ],
);
