import {
  check,
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const ASSESSMENT_INGEST_BATCH_STATUSES = [
  "pending",
  "completed",
  "failed",
] as const;

export const ASSESSMENT_INGEST_SOURCE_TYPES = [
  "crawler",
  "manual",
  "seed",
] as const;

export const assessmentIngestBatches = pgTable(
  "assessment_ingest_batches",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    sourceType: varchar("source_type", { length: 30 }).notNull(),
    sourceLabel: varchar("source_label", { length: 255 }).notNull(),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    rawPayload: jsonb("raw_payload").$type<Record<string, unknown>>(),
    createdBy: varchar("created_by", { length: 64 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("assessment_ingest_batches_status_idx").on(table.status),
    index("assessment_ingest_batches_created_at_idx").on(table.createdAt),
    check(
      "assessment_ingest_batches_source_type_check",
      sql`${table.sourceType} IN ('crawler', 'manual', 'seed')`,
    ),
    check(
      "assessment_ingest_batches_status_check",
      sql`${table.status} IN ('pending', 'completed', 'failed')`,
    ),
  ],
);
