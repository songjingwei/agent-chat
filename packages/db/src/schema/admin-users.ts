import {
  boolean,
  check,
  index,
  pgTable,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const adminUsers = pgTable(
  "admin_users",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    username: varchar("username", { length: 80 }).notNull(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    displayName: varchar("display_name", { length: 80 }).notNull(),
    role: varchar("role", { length: 20 }).notNull().default("admin"),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdBy: varchar("created_by", { length: 64 }),
    updatedBy: varchar("updated_by", { length: 64 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("admin_users_username_idx").on(table.username),
    check(
      "admin_users_role_check",
      sql`${table.role} IN ('admin', 'super_admin')`,
    ),
  ],
);
