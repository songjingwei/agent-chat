import { Hono } from "hono";
import { sql } from "drizzle-orm";
import type { DbClient } from "@agent/db";
import {
  users,
  agentPersonas,
  chatSessions,
  chatMessages,
} from "@agent/db";

import { jsonOk } from "../../lib/http.js";

export const createAdminStatsRoutes = (db: DbClient) => {
  const routes = new Hono();

  // GET /stats/overview — total counts
  routes.get("/stats/overview", async (c) => {
    const [[usersCount], [personasCount], [sessionsCount], [messagesCount]] =
      await Promise.all([
        db.select({ count: sql<number>`count(*)::int` }).from(users),
        db.select({ count: sql<number>`count(*)::int` }).from(agentPersonas),
        db.select({ count: sql<number>`count(*)::int` }).from(chatSessions),
        db.select({ count: sql<number>`count(*)::int` }).from(chatMessages),
      ]);

    return jsonOk(c, {
      totalUsers: usersCount!.count,
      totalPersonas: personasCount!.count,
      totalSessions: sessionsCount!.count,
      totalMessages: messagesCount!.count,
    });
  });

  return routes;
};
