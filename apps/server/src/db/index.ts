import { drizzle as drizzleBunSqlite } from 'drizzle-orm/bun-sqlite';
import { drizzle as drizzleLibsql } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { Database } from 'bun:sqlite';
import * as schema from './schema';
import { mkdirSync } from 'fs';

const TURSO_DATABASE_URL = process.env.TURSO_DATABASE_URL;
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN;

let db: ReturnType<typeof drizzleBunSqlite> | ReturnType<typeof drizzleLibsql>;

if (TURSO_DATABASE_URL && TURSO_AUTH_TOKEN) {
  // Use Turso (remote libsql)
  console.log('🔗 Connecting to Turso database...');
  const client = createClient({
    url: TURSO_DATABASE_URL,
    authToken: TURSO_AUTH_TOKEN,
  });
  db = drizzleLibsql(client, { schema });
  console.log('✅ Connected to Turso');
} else {
  // Fallback to local SQLite
  console.log('📁 Using local SQLite database...');
  mkdirSync('./data', { recursive: true });
  const sqlite = new Database('./data/vibehq.db');
  sqlite.run('PRAGMA journal_mode = WAL');
  sqlite.run('PRAGMA foreign_keys = ON');
  db = drizzleBunSqlite(sqlite, { schema });
  console.log('✅ Local SQLite ready');
}

export { db };
export * from './schema';
