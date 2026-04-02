import 'dotenv/config';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { env } from '../lib/env';
import { Pool } from 'pg';
import * as schema from './schema';

const globalForDb = globalThis as unknown as {
    db: NodePgDatabase<typeof schema> | undefined;
};

export const db = globalForDb.db ?? drizzle(new Pool({
    connectionString: env.DATABASE_URL,
}), { schema });

if (process.env.NODE_ENV !== 'production') {
    globalForDb.db = db;
}