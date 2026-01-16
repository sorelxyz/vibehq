import { Database } from 'bun:sqlite';
import { mkdirSync } from 'fs';

export function migrate() {
  // Ensure data directory exists
  mkdirSync('./data', { recursive: true });

  const sqlite = new Database('./data/vibehq.db');
  sqlite.run('PRAGMA journal_mode = WAL');
  sqlite.run('PRAGMA foreign_keys = ON');

  // Create tables if they don't exist
  sqlite.run(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      path TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )
  `);

  sqlite.run(`
    CREATE TABLE IF NOT EXISTS tickets (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'backlog' CHECK(status IN ('backlog', 'up_next', 'in_review', 'in_progress', 'in_testing', 'completed')),
      prd_content TEXT,
      branch_name TEXT,
      position INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    )
  `);

  sqlite.run(`
    CREATE TABLE IF NOT EXISTS ticket_images (
      id TEXT PRIMARY KEY,
      ticket_id TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
      filename TEXT NOT NULL,
      storage_path TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size INTEGER NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )
  `);

  sqlite.run(`
    CREATE TABLE IF NOT EXISTS ralph_instances (
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
    )
  `);

  sqlite.close();

  console.log('Database migrations completed');
}
