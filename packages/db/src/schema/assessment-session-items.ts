import {
  index,
  integer,
  jsonb,
  pgTable,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { assessmentItems } from "./assessment-items.js";
import type { AssessmentItemCandidateOption } from "./assessment-item-candidates.js";
import { assessmentSessions } from "./assessment-sessions.js";
import { assessmentTemplateSlots } from "./assessment-template-slots.js";

export const assessmentSessionItems = pgTable(
  "assessment_session_items",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    sessionId: varchar("session_id", { length: 64 })
      .notNull()
      .references(() => assessmentSessions.id, { onDelete: "cascade" }),
    slotId: varchar("slot_id", { length: 64 })
      .notNull()
      .references(() => assessmentTemplateSlots.id),
    itemId: varchar("item_id", { length: 64 })
      .notNull()
      .references(() => assessmentItems.id),
    displayOrder: integer("display_order").notNull(),
    questionSnapshot: varchar("question_snapshot", { length: 4000 }).notNull(),
    optionsSnapshot: jsonb("options_snapshot").$type<AssessmentItemCandidateOption[]>().default([]),
    answeredAt: timestamp("answered_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("assessment_session_items_session_id_display_order_idx").on(
      table.sessionId,
      table.displayOrder,
    ),
    uniqueIndex("assessment_session_items_session_id_slot_id_idx").on(
      table.sessionId,
      table.slotId,
    ),
    index("assessment_session_items_session_id_idx").on(table.sessionId),
  ],
);
