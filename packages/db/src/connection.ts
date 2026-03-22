import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema/index.js";

export type DbClient = ReturnType<typeof createDbClient>;

export const createDbClient = (databaseUrl: string) => {
  const pool = new pg.Pool({ connectionString: databaseUrl });
  return drizzle(pool, { schema });
};
