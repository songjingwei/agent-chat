import crypto from "node:crypto";
import { eq, and, desc } from "drizzle-orm";
import type { DbClient } from "../connection.js";
import { memoryItems } from "../schema/index.js";

export type MemoryItem = typeof memoryItems.$inferSelect;
export type NewMemoryItem = Omit<
  typeof memoryItems.$inferInsert,
  "id" | "createdAt" | "updatedAt"
>;

function generateId() {
  return `mem_${crypto.randomUUID().replace(/-/g, "")}`;
}

export async function findMemoryItemsByPersonaId(
  db: DbClient,
  personaId: string,
) {
  return db
    .select()
    .from(memoryItems)
    .where(eq(memoryItems.personaId, personaId))
    .orderBy(desc(memoryItems.weight));
}

export async function findMemoryItemsBySessionId(
  db: DbClient,
  sessionId: string,
) {
  return db
    .select()
    .from(memoryItems)
    .where(eq(memoryItems.sessionId, sessionId))
    .orderBy(desc(memoryItems.weight));
}

export async function createMemoryItem(db: DbClient, data: NewMemoryItem) {
  const id = generateId();
  const rows = await db
    .insert(memoryItems)
    .values({ ...data, id })
    .returning();
  return rows[0]!;
}

export async function updateMemoryItem(
  db: DbClient,
  id: string,
  data: Partial<
    Pick<MemoryItem, "content" | "weight" | "category" | "source" | "metadata" | "embedding">
  >,
) {
  const rows = await db
    .update(memoryItems)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(memoryItems.id, id))
    .returning();
  return rows[0] ?? null;
}
