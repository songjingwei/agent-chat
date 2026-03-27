import {
  index,
  jsonb,
  pgTable,
  real,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { assessmentSessionItems } from "./assessment-session-items.js";

export const assessmentAnswers = pgTable(
  "assessment_answers",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    sessionItemId: varchar("session_item_id", { length: 64 })
      .notNull()
      .references(() => assessmentSessionItems.id, { onDelete: "cascade" }),
    selectedOptionValue: varchar("selected_option_value", { length: 120 }),
    freeTextAnswer: varchar("free_text_answer", { length: 4000 }),
    normalizedScore: real("normalized_score"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("assessment_answers_session_item_id_idx").on(table.sessionItemId),
    index("assessment_answers_created_at_idx").on(table.createdAt),
  ],
);
