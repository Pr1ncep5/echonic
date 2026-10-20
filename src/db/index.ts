import "dotenv/config";
import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import { env } from "../lib/env";
import { Pool } from "pg";
import * as schema from "./schema";

declare global {
  // Reused across Next.js dev hot reloads so each reload doesn't open a new connection pool.
  var echonicDb: NodePgDatabase<typeof schema> | undefined;
}

export const db =
  globalThis.echonicDb ??
  drizzle(
    new Pool({
      connectionString: env.DATABASE_URL,
    }),
    { schema },
  );

if (process.env.NODE_ENV !== "production") {
  globalThis.echonicDb = db;
}
