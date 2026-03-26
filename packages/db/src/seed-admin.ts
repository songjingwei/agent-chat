/**
 * Seed script to create initial super_admin user.
 *
 * Usage:
 *   pnpm --filter @agent/db seed:admin
 *
 * The password is read from ADMIN_INITIAL_PASSWORD env var (default: "admin123").
 */
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

import { createDbClient } from "./connection.js";
import { adminUsers } from "./schema/index.js";

const createId = (prefix: string): string => {
  const token = crypto.randomUUID().replaceAll("-", "");
  return `${prefix}_${token}`;
};

const seed = async () => {
  const databaseUrl =
    process.env.DATABASE_URL ??
    "postgres://postgres:postgres@localhost:5432/agent_chat";
  const password = process.env.ADMIN_INITIAL_PASSWORD ?? "admin123";

  const db = createDbClient(databaseUrl);

  // Check if super_admin already exists
  const existing = await db
    .select({ id: adminUsers.id })
    .from(adminUsers)
    .where(eq(adminUsers.username, "admin"))
    .limit(1);

  if (existing.length > 0) {
    console.log("[seed] super_admin user already exists, skipping.");
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const now = new Date();

  await db.insert(adminUsers).values({
    id: createId("adm"),
    username: "admin",
    passwordHash,
    displayName: "Super Admin",
    role: "super_admin",
    createdAt: now,
    updatedAt: now,
  });

  console.log("[seed] super_admin user created successfully.");
  console.log(`[seed] username: admin`);
  console.log(`[seed] password: ${password}`);
  process.exit(0);
};

seed().catch((err) => {
  console.error("[seed] Failed to create admin user:", err);
  process.exit(1);
});
