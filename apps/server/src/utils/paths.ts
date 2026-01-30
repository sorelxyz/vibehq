import { join } from 'path';

const REPOS_BASE = process.env.REPOS_BASE || './repos';

/**
 * Resolve a project's repo path to an absolute filesystem path.
 * Projects store just the repo name (e.g., "marty").
 * REPOS_BASE env var defines where repos live on this machine.
 */
export function resolveRepoPath(repoName: string): string {
  return join(REPOS_BASE, repoName);
}
