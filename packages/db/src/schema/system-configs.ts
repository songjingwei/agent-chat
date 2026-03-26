import {
  boolean,
  check,
  pgTable,
  timestamp,
  text,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const systemConfigs = pgTable(
  "system_configs",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    configKey: varchar("config_key", { length: 128 }).notNull(),
    configValue: text("config_value").notNull(),
    valueType: varchar("value_type", { length: 20 }).notNull(),
    description: varchar("description", { length: 500 }),
    isSecret: boolean("is_secret").notNull().default(false),
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
    uniqueIndex("system_configs_key_idx").on(table.configKey),
    check(
      "system_configs_value_type_check",
      sql`${table.valueType} IN ('string', 'number', 'boolean', 'json')`,
    ),
  ],
);
