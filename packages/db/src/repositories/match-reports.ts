import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import type { DbClient } from "../connection.js";
import { matchReports } from "../schema/index.js";

export type MatchReport = typeof matchReports.$inferSelect;
export type NewMatchReport = Omit<
  typeof matchReports.$inferInsert,
  "id" | "createdAt" | "updatedAt"
>;

function generateId() {
  return `rpt_${crypto.randomUUID().replace(/-/g, "")}`;
}

export async function findMatchReportsBySessionId(
  db: DbClient,
  sessionId: string,
) {
  return db
    .select()
    .from(matchReports)
    .where(eq(matchReports.sessionId, sessionId));
}

export async function createMatchReport(db: DbClient, data: NewMatchReport) {
  const id = generateId();
  const rows = await db
    .insert(matchReports)
    .values({ ...data, id })
    .returning();
  return rows[0]!;
}

export async function updateMatchReport(
  db: DbClient,
  id: string,
  data: Partial<
    Pick<
      MatchReport,
      | "status"
      | "compatibilityScore"
      | "summary"
      | "recommendation"
      | "analysisData"
    >
  >,
) {
  const rows = await db
    .update(matchReports)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(matchReports.id, id))
    .returning();
  return rows[0] ?? null;
}
