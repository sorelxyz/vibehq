import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import * as schema from './schema';
import { mkdirSync } from 'fs';

// Create data directory if not exists
mkdirSync('./data', { recursive: true });

// Create database with WAL mode
const sqlite = new Database('./data/vibehq.db');
sqlite.run('PRAGMA journal_mode = WAL');
sqlite.run('PRAGMA foreign_keys = ON');

export const db = drizzle(sqlite, { schema });

// Export schema for use elsewhere
export * from './schema';
