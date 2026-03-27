import {
  check,
  index,
  integer,
  pgTable,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { agentPersonas } from "./agent-personas.js";
import { assessmentTemplates } from "./assessment-templates.js";
import { users } from "./users.js";

export const ASSESSMENT_SESSION_STATUSES = [
  "pending",
  "in_progress",
  "submitted",
  "interpreting",
  "completed",
  "failed",
] as const;

export const assessmentSessions = pgTable(
  "assessment_sessions",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    userId: varchar("user_id", { length: 64 })
      .notNull()
      .references(() => users.id),
    personaId: varchar("persona_id", { length: 64 })
      .notNull()
      .references(() => agentPersonas.id),
    templateId: varchar("template_id", { length: 64 })
      .notNull()
      .references(() => assessmentTemplates.id),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    currentIndex: integer("current_index").notNull().default(0),
    seed: varchar("seed", { length: 64 }).notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("assessment_sessions_user_id_idx").on(table.userId),
    index("assessment_sessions_persona_id_idx").on(table.personaId),
    index("assessment_sessions_status_created_at_idx").on(
      table.status,
      table.createdAt,
    ),
    check(
      "assessment_sessions_status_check",
      sql`${table.status} IN ('pending', 'in_progress', 'submitted', 'interpreting', 'completed', 'failed')`,
    ),
  ],
);
