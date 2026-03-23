import crypto from "node:crypto";
import { eq, and, isNull } from "drizzle-orm";
import type { DbClient } from "../connection.js";
import { agentPersonas } from "../schema/index.js";

export type AgentPersona = typeof agentPersonas.$inferSelect;
export type NewAgentPersona = Omit<
  typeof agentPersonas.$inferInsert,
  "id" | "createdAt" | "updatedAt"
>;

function generateId() {
  return `aps_${crypto.randomUUID().replace(/-/g, "")}`;
}

export async function findAgentPersonaById(db: DbClient, id: string) {
  const rows = await db
    .select()
    .from(agentPersonas)
    .where(and(eq(agentPersonas.id, id), isNull(agentPersonas.deletedAt)));
  return rows[0] ?? null;
}

export async function findAgentPersonasByUserId(db: DbClient, userId: string) {
  return db
    .select()
    .from(agentPersonas)
    .where(
      and(eq(agentPersonas.userId, userId), isNull(agentPersonas.deletedAt)),
    );
}

export async function createAgentPersona(db: DbClient, data: NewAgentPersona) {
  const id = generateId();
  const rows = await db
    .insert(agentPersonas)
    .values({ ...data, id })
    .returning();
  return rows[0]!;
}

export async function updateAgentPersona(
  db: DbClient,
  id: string,
  data: Partial<
    Pick<
      AgentPersona,
      | "name"
      | "bio"
      | "systemPrompt"
      | "traits"
      | "version"
      | "status"
      | "updatedBy"
    >
  >,
) {
  const rows = await db
    .update(agentPersonas)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(agentPersonas.id, id), isNull(agentPersonas.deletedAt)))
    .returning();
  return rows[0] ?? null;
}

export async function softDeleteAgentPersona(db: DbClient, id: string) {
  const rows = await db
    .update(agentPersonas)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(agentPersonas.id, id), isNull(agentPersonas.deletedAt)))
    .returning();
  return rows[0] ?? null;
}
