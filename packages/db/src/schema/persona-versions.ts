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
import { agentPersonas } from "./agent-personas.js";

export const PERSONA_VERSION_CHANGE_SOURCES = [
  "persona_build",
  "manual_edit",
  "assessment_calibration",
] as const;

export const personaVersions = pgTable(
  "persona_versions",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    personaId: varchar("persona_id", { length: 64 })
      .notNull()
      .references(() => agentPersonas.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    snapshot: jsonb("snapshot").$type<Record<string, unknown>>().notNull(),
    changeSource: varchar("change_source", { length: 30 }).notNull(),
    sourceRefId: varchar("source_ref_id", { length: 64 }),
    createdBy: varchar("created_by", { length: 64 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("persona_versions_persona_id_version_idx").on(
      table.personaId,
      table.version,
    ),
    index("persona_versions_persona_id_idx").on(table.personaId),
    check(
      "persona_versions_change_source_check",
      sql`${table.changeSource} IN ('persona_build', 'manual_edit', 'assessment_calibration')`,
    ),
  ],
);
