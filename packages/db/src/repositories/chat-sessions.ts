import crypto from "node:crypto";
import { eq, and, isNull } from "drizzle-orm";
import type { DbClient } from "../connection.js";
import { chatSessions } from "../schema/index.js";

export type ChatSession = typeof chatSessions.$inferSelect;
export type NewChatSession = Omit<
  typeof chatSessions.$inferInsert,
  "id" | "createdAt" | "updatedAt"
>;

function generateId() {
  return `ses_${crypto.randomUUID().replace(/-/g, "")}`;
}

export async function findChatSessionById(db: DbClient, id: string) {
  const rows = await db
    .select()
    .from(chatSessions)
    .where(and(eq(chatSessions.id, id), isNull(chatSessions.deletedAt)));
  return rows[0] ?? null;
}

export async function findChatSessionsByPersonaId(
  db: DbClient,
  personaId: string,
) {
  return db
    .select()
    .from(chatSessions)
    .where(
      and(
        eq(chatSessions.initiatorPersonaId, personaId),
        isNull(chatSessions.deletedAt),
      ),
    );
}

export async function createChatSession(db: DbClient, data: NewChatSession) {
  const id = generateId();
  const rows = await db
    .insert(chatSessions)
    .values({ ...data, id })
    .returning();
  return rows[0]!;
}

export async function updateChatSessionStatus(
  db: DbClient,
  id: string,
  status: string,
  updatedBy?: string,
) {
  const rows = await db
    .update(chatSessions)
    .set({ status, updatedBy, updatedAt: new Date() })
    .where(and(eq(chatSessions.id, id), isNull(chatSessions.deletedAt)))
    .returning();
  return rows[0] ?? null;
}

export async function softDeleteChatSession(db: DbClient, id: string) {
  const rows = await db
    .update(chatSessions)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(chatSessions.id, id), isNull(chatSessions.deletedAt)))
    .returning();
  return rows[0] ?? null;
}
