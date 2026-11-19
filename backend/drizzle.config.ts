import { defineConfig } from 'drizzle-kit';

try {
  process.loadEnvFile();
} catch {
  // .env is optional; DATABASE_URL may come from the environment.
}

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/database/schema/index.ts',
  out: './src/database/migrations',
  dbCredentials: { url: process.env.DATABASE_URL },
  // Supabase-managed schemas (auth, storage, realtime…) are not ours to diff.
  schemaFilter: ['public'],
  extensionsFilters: ['postgis'],
  casing: 'snake_case',
  strict: true,
  verbose: true,
});
