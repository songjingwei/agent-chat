import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { assessmentSessions } from "./assessment-sessions.js";

export const ASSESSMENT_INTERPRETATION_STATUSES = [
  "pending",
  "completed",
  "failed",
  "applied",
] as const;

export const assessmentInterpretations = pgTable(
  "assessment_interpretations",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    sessionId: varchar("session_id", { length: 64 })
      .notNull()
      .references(() => assessmentSessions.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    modelProvider: varchar("model_provider", { length: 30 }),
    modelName: varchar("model_name", { length: 120 }),
    promptVersion: varchar("prompt_version", { length: 30 }),
    summary: varchar("summary", { length: 4000 }),
    confidence: real("confidence"),
    dimensionScores: jsonb("dimension_scores").$type<Record<string, unknown>[]>(),
    memoryWrites: jsonb("memory_writes").$type<Record<string, unknown>[]>(),
    personaPatch: jsonb("persona_patch").$type<Record<string, unknown>>(),
    evidence: jsonb("evidence").$type<Record<string, unknown>[]>(),
    rawOutput: jsonb("raw_output").$type<Record<string, unknown>>(),
    errorCode: varchar("error_code", { length: 80 }),
    appliedPersonaVersion: integer("applied_persona_version"),
    appliedAt: timestamp("applied_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("assessment_interpretations_session_id_idx").on(table.sessionId),
    index("assessment_interpretations_status_idx").on(table.status),
    check(
      "assessment_interpretations_status_check",
      sql`${table.status} IN ('pending', 'completed', 'failed', 'applied')`,
    ),
    check(
      "assessment_interpretations_confidence_check",
      sql`${table.confidence} IS NULL OR (${table.confidence} >= 0 AND ${table.confidence} <= 1)`,
    ),
  ],
);
