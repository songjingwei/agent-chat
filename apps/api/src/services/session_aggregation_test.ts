
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { SessionService } from "./session.service.js";
import * as schema from "../../../../packages/db/src/schema/index.js";
import { apiConfig } from "../config.js";
import { createId } from "../lib/id.js";

async function testAggregation() {
  const pool = new pg.Pool({ connectionString: apiConfig.databaseUrl });
  const db = drizzle(pool, { schema });
  const service = new SessionService(db);

  const p1 = createId("prs");
  const p2 = createId("prs");
  const userId = createId("usr");

  console.log("Creating first session...");
  const s1 = await service.create({ initiatorPersonaId: p1, targetPersonaId: p2 });
  console.log("S1:", s1.id, s1.status);

  console.log("Creating second session (idempotent check)...");
  const s2 = await service.create({ initiatorPersonaId: p1, targetPersonaId: p2 });
  console.log("S2:", s2.id, s2.status);

  if (s1.id !== s2.id) {
    console.error("Aggregation failed: Expected same session ID");
  } else {
    console.log("Idempotent creation works!");
  }

  // Manually insert another completed session to test list aggregation
  console.log("Inserting a completed session for the same pair...");
  await db.insert(schema.chatSessions).values({
    id: createId("ses"),
    initiatorPersonaId: p1,
    targetPersonaId: p2,
    status: "completed",
    currentRound: 10,
    maxRounds: 20,
    createdBy: userId,
    updatedBy: userId,
    createdAt: new Date(Date.now() - 10000),
    updatedAt: new Date(Date.now() - 10000),
  });

  console.log("Listing sessions for user...");
  // We need to associate p1/p2 with a user for filters.userId to work, 
  // but list() also supports just personaId or no filters.
  const list = await service.list({ personaId: p1 });
  console.log("List size:", list.length);
  
  if (list.length !== 1) {
    console.error("List aggregation failed: Expected 1 session, got", list.length);
  } else {
    console.log("List aggregation works!");
  }

  await pool.end();
}

testAggregation().catch(console.error);
