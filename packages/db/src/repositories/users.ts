import crypto from "node:crypto";
import { eq, and, isNull } from "drizzle-orm";
import type { DbClient } from "../connection.js";
import { users } from "../schema/index.js";

export type User = typeof users.$inferSelect;
export type NewUser = Omit<typeof users.$inferInsert, "id" | "createdAt" | "updatedAt">;

function generateId() {
  return `usr_${crypto.randomUUID().replace(/-/g, "")}`;
}

export async function findUserById(db: DbClient, id: string) {
  const rows = await db
    .select()
    .from(users)
    .where(and(eq(users.id, id), isNull(users.deletedAt)));
  return rows[0] ?? null;
}

export async function findUserByEmail(db: DbClient, email: string) {
  const rows = await db
    .select()
    .from(users)
    .where(and(eq(users.email, email), isNull(users.deletedAt)));
  return rows[0] ?? null;
}

export async function createUser(db: DbClient, data: NewUser) {
  const id = generateId();
  const rows = await db
    .insert(users)
    .values({ ...data, id })
    .returning();
  return rows[0]!;
}

export async function updateUser(
  db: DbClient,
  id: string,
  data: Partial<Pick<User, "email" | "passwordHash" | "displayName">>,
) {
  const rows = await db
    .update(users)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(users.id, id), isNull(users.deletedAt)))
    .returning();
  return rows[0] ?? null;
}

export async function softDeleteUser(db: DbClient, id: string) {
  const rows = await db
    .update(users)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(users.id, id), isNull(users.deletedAt)))
    .returning();
  return rows[0] ?? null;
}
