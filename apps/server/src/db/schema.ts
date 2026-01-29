import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// projects - Codebases that can have tickets
export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(), // nanoid
  name: text('name').notNull(),
  path: text('path').notNull(), // Local filesystem path to codebase
  color: text('color').notNull().default('#3b82f6'), // Project color (default blue)
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

// tickets - Work items that go through the kanban workflow
export const tickets = sqliteTable('tickets', {
  id: text('id').primaryKey(), // nanoid
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description').notNull(),
  status: text('status', {
    enum: ['backlog', 'up_next', 'in_review', 'in_progress', 'in_testing', 'completed']
  }).notNull().default('backlog'),
  prdContent: text('prd_content'), // Generated PRD markdown
  stepsContent: text('steps_content'), // JSON stringified Step[] parsed from PRD
  branchName: text('branch_name'), // Git branch for this ticket
  position: integer('position').notNull().default(0), // Order within status column
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

// ticket_images - Attached images for tickets
export const ticketImages = sqliteTable('ticket_images', {
  id: text('id').primaryKey(), // nanoid
  ticketId: text('ticket_id').notNull().references(() => tickets.id, { onDelete: 'cascade' }),
  filename: text('filename').notNull(), // Original filename
  storagePath: text('storage_path').notNull(), // Path in uploads folder
  mimeType: text('mime_type').notNull(),
  size: integer('size').notNull(), // File size in bytes
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

// ralph_instances - Running or completed RALPH executions
export const ralphInstances = sqliteTable('ralph_instances', {
  id: text('id').primaryKey(), // nanoid
  ticketId: text('ticket_id').notNull().references(() => tickets.id, { onDelete: 'cascade' }),
  status: text('status', {
    enum: ['pending', 'running', 'completed', 'failed']
  }).notNull().default('pending'),
  worktreePath: text('worktree_path'), // Path to git worktree
  logPath: text('log_path'), // Path to log file
  prdFilePath: text('prd_file_path'), // Path to generated PRD file
  scriptPath: text('script_path'), // Path to RALPH bash script
  pid: integer('pid'), // Process ID when running
  exitCode: integer('exit_code'), // Exit code when completed
  startedAt: integer('started_at', { mode: 'timestamp' }),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});
