import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './schema/index.js';

export type Database = PostgresJsDatabase<typeof schema>;
/** A database handle or an open transaction: repositories accept either. */
export type DbExecutor = Parameters<Parameters<Database['transaction']>[0]>[0] | Database;

export interface DatabaseConnection {
  db: Database;
  close: () => Promise<void>;
}

export const createDatabase = (url: string): DatabaseConnection => {
  // `prepare: false` keeps us compatible with Supabase's transaction pooler as well.
  const client = postgres(url, { max: 10, prepare: false, idle_timeout: 20 });
  const db = drizzle({ client, schema, casing: 'snake_case' });
  return { db, close: () => client.end({ timeout: 5 }) };
};

export { schema };
