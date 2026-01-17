import { db, ralphInstances } from '../db';
import { eq, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { mkdir, writeFile } from 'fs/promises';
import { exec } from '../utils/shell';
import * as worktreeService from './worktree';
import type { RalphInstance, Ticket, Project, RalphStatus } from '@vibehq/shared';
import type { Subprocess } from 'bun';

// Store running processes (in memory)
const runningProcesses = new Map<string, Subprocess>();

export interface CreateRalphResult {
  instance: RalphInstance;
  branchName: string;
}

/**
 * Create a RALPH instance for a ticket
 */
export async function createRalphInstance(
  ticket: Ticket,
  project: Project
): Promise<CreateRalphResult> {
  const id = nanoid();

  // Create worktree
  const { worktreePath, branchName } = await worktreeService.createWorktree(
    project.path,
    ticket.id,
    ticket.title
  );

  // Create instance directory inside worktree
  const instanceDir = `${worktreePath}/.ralph-instance`;
  await mkdir(instanceDir, { recursive: true });

  // Write PRD file
  const prdFilePath = `${instanceDir}/prd.md`;
  await writeFile(prdFilePath, ticket.prdContent || '');

  // Write empty progress file
  const progressPath = `${instanceDir}/progress.txt`;
  await writeFile(progressPath, '');

  // Generate RALPH script
  const scriptPath = `${instanceDir}/run-ralph.sh`;
  const logPath = `${instanceDir}/ralph.log`;

  const scriptContent = `#!/bin/bash
set -e
cd "${worktreePath}"

# Run RALPH using Claude Code
claude --dangerously-skip-permissions --print "You are RALPH, an autonomous coding agent.

Read the PRD at ${prdFilePath} to understand what needs to be built.
Read the progress file at ${progressPath} to see what has already been done.

Your task:
1. Identify the next incomplete item from the PRD
2. Implement it fully
3. Run any type checking or linting commands specified in the PRD
4. Commit your changes with a descriptive message
5. Update ${progressPath} with what you completed

If all items in the PRD are complete, output: RALPH_COMPLETE

Work autonomously. Make decisions. Ship code." 2>&1 | tee -a "${logPath}"
`;

  await writeFile(scriptPath, scriptContent);
  await exec(`chmod +x "${scriptPath}"`);

  // Create database record
  const [row] = await db.insert(ralphInstances).values({
    id,
    ticketId: ticket.id,
    status: 'pending',
    worktreePath,
    logPath,
    prdFilePath,
    scriptPath,
  }).returning();

  return { instance: mapToRalphInstance(row), branchName };
}

/**
 * Start a RALPH instance
 */
export async function startRalphInstance(instanceId: string): Promise<void> {
  const [instance] = await db.select()
    .from(ralphInstances)
    .where(eq(ralphInstances.id, instanceId));

  if (!instance) throw new Error('Instance not found');
  if (instance.status === 'running') throw new Error('Instance already running');
  if (!instance.scriptPath) throw new Error('No script path');

  // Spawn the RALPH process
  const proc = Bun.spawn(['bash', instance.scriptPath], {
    cwd: instance.worktreePath!,
    stdout: 'pipe',
    stderr: 'pipe',
  });

  // Store process reference
  runningProcesses.set(instanceId, proc);

  // Update database with PID and status
  await db.update(ralphInstances)
    .set({
      status: 'running',
      pid: proc.pid,
      startedAt: new Date(),
    })
    .where(eq(ralphInstances.id, instanceId));
}

/**
 * Stop a running RALPH instance
 */
export async function stopRalphInstance(instanceId: string): Promise<void> {
  const proc = runningProcesses.get(instanceId);
  if (proc) {
    proc.kill();
    runningProcesses.delete(instanceId);
  }

  await db.update(ralphInstances)
    .set({
      status: 'failed',
      completedAt: new Date(),
    })
    .where(eq(ralphInstances.id, instanceId));
}

/**
 * Get RALPH instance by ID
 */
export async function getRalphInstance(id: string): Promise<RalphInstance | null> {
  const [row] = await db.select()
    .from(ralphInstances)
    .where(eq(ralphInstances.id, id));
  return row ? mapToRalphInstance(row) : null;
}

/**
 * Get RALPH instance for a ticket
 */
export async function getRalphInstanceForTicket(ticketId: string): Promise<RalphInstance | null> {
  const [row] = await db.select()
    .from(ralphInstances)
    .where(eq(ralphInstances.ticketId, ticketId))
    .orderBy(desc(ralphInstances.createdAt));
  return row ? mapToRalphInstance(row) : null;
}

/**
 * Get all running instances
 */
export async function getRunningInstances(): Promise<RalphInstance[]> {
  const rows = await db.select()
    .from(ralphInstances)
    .where(eq(ralphInstances.status, 'running'));
  return rows.map(mapToRalphInstance);
}

/**
 * Check if a process is still running
 */
export function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get running process reference
 */
export function getRunningProcess(instanceId: string): Subprocess | undefined {
  return runningProcesses.get(instanceId);
}

/**
 * Remove process from tracking
 */
export function removeProcess(instanceId: string): void {
  runningProcesses.delete(instanceId);
}

/**
 * Clean up a RALPH instance (removes worktree, keeps branch for review)
 */
export async function cleanupRalphInstance(
  instanceId: string,
  projectPath: string
): Promise<void> {
  const instance = await getRalphInstance(instanceId);
  if (!instance) throw new Error('Instance not found');

  // Delete worktree (keeps branch for review)
  if (instance.worktreePath) {
    await worktreeService.deleteWorktree(
      projectPath,
      instance.worktreePath,
      undefined,
      false // Don't delete branch yet
    );
  }
}

/**
 * Clean up instance and delete branch
 */
export async function cleanupAndDeleteBranch(
  instanceId: string,
  projectPath: string,
  branchName?: string
): Promise<void> {
  const instance = await getRalphInstance(instanceId);
  if (!instance) throw new Error('Instance not found');

  if (instance.worktreePath) {
    await worktreeService.deleteWorktree(
      projectPath,
      instance.worktreePath,
      branchName,
      true // Delete branch too
    );
  }
}

function mapToRalphInstance(row: typeof ralphInstances.$inferSelect): RalphInstance {
  return {
    id: row.id,
    ticketId: row.ticketId,
    status: row.status as RalphStatus,
    worktreePath: row.worktreePath,
    logPath: row.logPath,
    prdFilePath: row.prdFilePath,
    scriptPath: row.scriptPath,
    pid: row.pid,
    exitCode: row.exitCode,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    createdAt: row.createdAt,
  };
}
