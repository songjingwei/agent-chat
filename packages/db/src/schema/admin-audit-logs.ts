import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { adminUsers } from "./admin-users.js";

export const adminAuditLogs = pgTable(
  "admin_audit_logs",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    adminUserId: varchar("admin_user_id", { length: 64 })
      .notNull()
      .references(() => adminUsers.id),
    action: varchar("action", { length: 50 }).notNull(),
    resourceType: varchar("resource_type", { length: 50 }).notNull(),
    resourceId: varchar("resource_id", { length: 64 }).notNull(),
    diffJson: jsonb("diff_json"),
    ipAddress: varchar("ip_address", { length: 45 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("admin_audit_logs_admin_user_id_idx").on(table.adminUserId),
    index("admin_audit_logs_resource_idx").on(
      table.resourceType,
      table.resourceId,
    ),
    index("admin_audit_logs_created_at_idx").on(table.createdAt),
  ],
);
