import { exec } from '../utils/shell';
import { mkdir, rm } from 'fs/promises';
import type { WorktreeInfo, FileChange } from '@vibehq/shared';

/**
 * Create a git worktree with a new branch for a ticket
 */
export async function createWorktree(
  projectPath: string,
  ticketId: string,
  ticketTitle: string
): Promise<{ worktreePath: string; branchName: string }> {
  // Generate branch name: ralph/{ticketId}-{slugified-title}
  const slug = ticketTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30);
  const branchName = `ralph/${ticketId}-${slug}`;

  // Worktree directory inside project
  const worktreesDir = `${projectPath}/.ralph-worktrees`;
  const worktreePath = `${worktreesDir}/${ticketId}`;

  // Ensure worktrees directory exists
  await mkdir(worktreesDir, { recursive: true });

  // Get the current branch name to base off of
  const { stdout: currentBranch } = await exec(
    'git rev-parse --abbrev-ref HEAD',
    { cwd: projectPath }
  );

  const { exitCode, stderr } = await exec(
    `git worktree add -b "${branchName}" "${worktreePath}" ${currentBranch.trim()}`,
    { cwd: projectPath }
  );

  if (exitCode !== 0) {
    throw new Error(`Failed to create worktree: ${stderr}`);
  }

  return { worktreePath, branchName };
}

/**
 * Delete a git worktree and optionally its branch
 */
export async function deleteWorktree(
  projectPath: string,
  worktreePath: string,
  branchName?: string,
  deleteBranch: boolean = false
): Promise<void> {
  // Remove the worktree
  const { exitCode: removeExitCode, stderr: removeStderr } = await exec(
    `git worktree remove "${worktreePath}" --force`,
    { cwd: projectPath }
  );

  // If worktree remove fails, try to force remove the directory
  if (removeExitCode !== 0) {
    console.warn(`Worktree remove failed: ${removeStderr}, trying manual cleanup`);
    await rm(worktreePath, { recursive: true, force: true });

    // Prune worktrees
    await exec('git worktree prune', { cwd: projectPath });
  }

  // Optionally delete the branch
  if (deleteBranch && branchName) {
    await exec(`git branch -D "${branchName}"`, { cwd: projectPath });
  }
}

/**
 * List all RALPH worktrees for a project
 */
export async function listWorktrees(projectPath: string): Promise<WorktreeInfo[]> {
  const { stdout, exitCode } = await exec(
    'git worktree list --porcelain',
    { cwd: projectPath }
  );

  if (exitCode !== 0) return [];

  const worktrees: WorktreeInfo[] = [];
  let current: Partial<WorktreeInfo> = {};

  for (const line of stdout.split('\n')) {
    if (line.startsWith('worktree ')) {
      if (current.path) worktrees.push(current as WorktreeInfo);
      current = { path: line.slice(9) };
    } else if (line.startsWith('HEAD ')) {
      current.head = line.slice(5);
    } else if (line.startsWith('branch ')) {
      current.branch = line.slice(7);
    }
  }

  if (current.path) worktrees.push(current as WorktreeInfo);

  // Filter to only ralph worktrees
  return worktrees.filter(w => w.path.includes('.ralph-worktrees'));
}

/**
 * Check if a path is a valid git repository
 */
export async function isGitRepo(path: string): Promise<boolean> {
  const { exitCode } = await exec('git rev-parse --git-dir', { cwd: path });
  return exitCode === 0;
}

/**
 * Get the main/master branch name
 */
export async function getMainBranch(projectPath: string): Promise<string> {
  // Check for main first, then master
  const { exitCode: mainExitCode } = await exec(
    'git rev-parse --verify main',
    { cwd: projectPath }
  );
  if (mainExitCode === 0) return 'main';

  const { exitCode: masterExitCode } = await exec(
    'git rev-parse --verify master',
    { cwd: projectPath }
  );
  if (masterExitCode === 0) return 'master';

  // Fall back to current branch
  const { stdout } = await exec(
    'git rev-parse --abbrev-ref HEAD',
    { cwd: projectPath }
  );
  return stdout.trim();
}

/**
 * Get the list of changed files between a branch and main
 */
export async function getFileChanges(
  projectPath: string,
  branchName: string
): Promise<FileChange[]> {
  const mainBranch = await getMainBranch(projectPath);

  // Use git diff with --name-status to get file status
  // Format: M\tfilename (Modified), A\tfilename (Added), D\tfilename (Deleted), R###\told\tnew (Renamed)
  const { stdout, exitCode } = await exec(
    `git diff --name-status ${mainBranch}...${branchName}`,
    { cwd: projectPath }
  );

  if (exitCode !== 0 || !stdout.trim()) {
    return [];
  }

  const changes: FileChange[] = [];

  for (const line of stdout.trim().split('\n')) {
    if (!line) continue;

    const parts = line.split('\t');
    const statusCode = parts[0];

    if (statusCode.startsWith('R')) {
      // Renamed file: R###\told\tnew
      changes.push({
        path: parts[2],
        status: 'renamed',
        oldPath: parts[1],
      });
    } else if (statusCode === 'A') {
      changes.push({ path: parts[1], status: 'added' });
    } else if (statusCode === 'M') {
      changes.push({ path: parts[1], status: 'modified' });
    } else if (statusCode === 'D') {
      changes.push({ path: parts[1], status: 'deleted' });
    }
  }

  return changes;
}
