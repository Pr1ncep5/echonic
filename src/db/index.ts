import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { env } from '../lib/env';
import { Pool } from 'pg';
import * as schema from './schema';

const pool = new Pool({
    connectionString: env.DATABASE_URL,
});

const globalForDb = globalThis as unknown as {
    db: ReturnType<typeof drizzle<typeof schema>>
};

export const db = globalForDb.db || drizzle(pool, { schema });

if (process.env.NODE_ENV !== 'production') {
    globalForDb.db = db;
}