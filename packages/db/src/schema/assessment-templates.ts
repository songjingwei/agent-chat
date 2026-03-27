import {
  check,
  jsonb,
  pgTable,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const ASSESSMENT_TEMPLATE_STATUSES = [
  "draft",
  "active",
  "archived",
] as const;

export const assessmentTemplates = pgTable(
  "assessment_templates",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    slug: varchar("slug", { length: 120 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    description: varchar("description", { length: 1000 }),
    framework: varchar("framework", { length: 50 }).notNull(),
    language: varchar("language", { length: 20 }).notNull().default("zh-CN"),
    status: varchar("status", { length: 20 }).notNull().default("draft"),
    selectionRules: jsonb("selection_rules").$type<Record<string, unknown>>(),
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
    uniqueIndex("assessment_templates_slug_idx").on(table.slug),
    check(
      "assessment_templates_status_check",
      sql`${table.status} IN ('draft', 'active', 'archived')`,
    ),
  ],
);
