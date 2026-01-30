import { createClient } from '@libsql/client';
import { Database } from 'bun:sqlite';
import { mkdirSync } from 'fs';

const TURSO_DATABASE_URL = process.env.TURSO_DATABASE_URL;
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN;

const migrations = [
  `CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    path TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#3b82f6',
    deployment_platform TEXT,
    deployment_project_name TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  )`,

  `CREATE TABLE IF NOT EXISTS tickets (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'backlog' CHECK(status IN ('backlog', 'up_next', 'in_review', 'in_progress', 'in_testing', 'completed')),
    prd_content TEXT,
    steps_content TEXT,
    branch_name TEXT,
    position INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  )`,

  `CREATE TABLE IF NOT EXISTS ticket_images (
    id TEXT PRIMARY KEY,
    ticket_id TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size INTEGER NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  )`,

  `CREATE TABLE IF NOT EXISTS ralph_instances (
    id TEXT PRIMARY KEY,
    ticket_id TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'running', 'completed', 'failed')),
    worktree_path TEXT,
    log_path TEXT,
    prd_file_path TEXT,
    script_path TEXT,
    pid INTEGER,
    exit_code INTEGER,
    started_at INTEGER,
    completed_at INTEGER,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  )`,
];

// Migrations for existing tables (ALTER TABLE)
const alterMigrations = [
  // Add deployment fields to projects (ignore if already exists)
  `ALTER TABLE projects ADD COLUMN deployment_platform TEXT`,
  `ALTER TABLE projects ADD COLUMN deployment_project_name TEXT`,
];

async function migrate() {
  if (TURSO_DATABASE_URL && TURSO_AUTH_TOKEN) {
    console.log('🔗 Running migrations on Turso...');
    const client = createClient({
      url: TURSO_DATABASE_URL,
      authToken: TURSO_AUTH_TOKEN,
    });

    for (const sql of migrations) {
      await client.execute(sql);
    }

    // Run ALTER migrations (ignore errors if columns already exist)
    for (const sql of alterMigrations) {
      try {
        await client.execute(sql);
      } catch (e) {
        // Column might already exist, ignore
      }
    }

    console.log('✅ Turso migrations completed');
  } else {
    console.log('📁 Running migrations on local SQLite...');
    mkdirSync('./data', { recursive: true });
    const sqlite = new Database('./data/vibehq.db');
    sqlite.run('PRAGMA journal_mode = WAL');
    sqlite.run('PRAGMA foreign_keys = ON');

    for (const sql of migrations) {
      sqlite.run(sql);
    }

    // Run ALTER migrations (ignore errors if columns already exist)
    for (const sql of alterMigrations) {
      try {
        sqlite.run(sql);
      } catch (e) {
        // Column might already exist, ignore
      }
    }

    sqlite.close();
    console.log('✅ Local SQLite migrations completed');
  }
}

migrate().catch(console.error);
