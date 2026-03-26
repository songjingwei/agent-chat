import { pgTable, varchar, timestamp, index } from "drizzle-orm/pg-core";
import { adminUsers } from "./admin-users.js";

export const adminRefreshTokens = pgTable(
  "admin_refresh_tokens",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    adminUserId: varchar("admin_user_id", { length: 64 })
      .notNull()
      .references(() => adminUsers.id),
    tokenHash: varchar("token_hash", { length: 255 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("admin_refresh_tokens_token_hash_idx").on(table.tokenHash),
    index("admin_refresh_tokens_admin_user_id_idx").on(table.adminUserId),
  ],
);
