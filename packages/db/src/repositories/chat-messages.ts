import crypto from "node:crypto";
import { eq, asc } from "drizzle-orm";
import type { DbClient } from "../connection.js";
import { chatMessages } from "../schema/index.js";

export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = Omit<
  typeof chatMessages.$inferInsert,
  "id" | "createdAt"
>;

function generateId() {
  return `msg_${crypto.randomUUID().replace(/-/g, "")}`;
}

export async function findChatMessagesBySessionId(
  db: DbClient,
  sessionId: string,
) {
  return db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, sessionId))
    .orderBy(asc(chatMessages.createdAt));
}

export async function createChatMessage(db: DbClient, data: NewChatMessage) {
  const id = generateId();
  const rows = await db
    .insert(chatMessages)
    .values({ ...data, id })
    .returning();
  return rows[0]!;
}

export async function createManyChatMessages(
  db: DbClient,
  data: NewChatMessage[],
) {
  const values = data.map((item) => ({
    ...item,
    id: generateId(),
  }));
  return db.insert(chatMessages).values(values).returning();
}
