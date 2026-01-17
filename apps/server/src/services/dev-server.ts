import type { Subprocess } from 'bun';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

interface DevServerInfo {
  process: Subprocess;
  port: number | null;
  url: string | null;
  worktreePath: string;
  startedAt: Date;
}

// Track running dev servers by instance ID
const runningDevServers = new Map<string, DevServerInfo>();

// Common port patterns in dev server output
const PORT_PATTERNS = [
  /localhost:(\d+)/i,
  /127\.0\.0\.1:(\d+)/i,
  /0\.0\.0\.0:(\d+)/i,
  /port\s*[:\s]\s*(\d+)/i,
  /running\s+(?:at|on)\s+.*:(\d+)/i,
  /http:\/\/[^:]+:(\d+)/i,
];

/**
 * Detect the dev command from package.json
 */
async function detectDevCommand(worktreePath: string): Promise<{ command: string; args: string[] } | null> {
  const packageJsonPath = join(worktreePath, 'package.json');

  if (!existsSync(packageJsonPath)) {
    return null;
  }

  try {
    const content = await readFile(packageJsonPath, 'utf-8');
    const pkg = JSON.parse(content);
    const scripts = pkg.scripts || {};

    // Priority order for dev commands
    const devScriptNames = ['dev', 'start', 'serve', 'develop'];

    for (const name of devScriptNames) {
      if (scripts[name]) {
        // Detect package manager
        const hasBunLock = existsSync(join(worktreePath, 'bun.lockb'));
        const hasPnpmLock = existsSync(join(worktreePath, 'pnpm-lock.yaml'));
        const hasYarnLock = existsSync(join(worktreePath, 'yarn.lock'));

        let pm = 'npm';
        if (hasBunLock) pm = 'bun';
        else if (hasPnpmLock) pm = 'pnpm';
        else if (hasYarnLock) pm = 'yarn';

        return { command: pm, args: ['run', name] };
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Extract port from dev server output
 */
function extractPort(text: string): number | null {
  for (const pattern of PORT_PATTERNS) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const port = parseInt(match[1], 10);
      if (port > 0 && port < 65536) {
        return port;
      }
    }
  }
  return null;
}

/**
 * Start a dev server for a RALPH instance
 */
export async function startDevServer(instanceId: string, worktreePath: string): Promise<{ port: number | null; url: string | null }> {
  // Check if already running
  if (runningDevServers.has(instanceId)) {
    const info = runningDevServers.get(instanceId)!;
    return { port: info.port, url: info.url };
  }

  // Detect dev command
  const devCommand = await detectDevCommand(worktreePath);
  if (!devCommand) {
    throw new Error('No dev script found in package.json. Expected: dev, start, serve, or develop');
  }

  // Spawn the dev server
  const proc = Bun.spawn([devCommand.command, ...devCommand.args], {
    cwd: worktreePath,
    stdout: 'pipe',
    stderr: 'pipe',
  });

  const info: DevServerInfo = {
    process: proc,
    port: null,
    url: null,
    worktreePath,
    startedAt: new Date(),
  };

  runningDevServers.set(instanceId, info);

  // Try to detect port from output
  const portPromise = new Promise<number | null>((resolve) => {
    const decoder = new TextDecoder();
    let outputBuffer = '';
    let resolved = false;

    const checkOutput = (text: string) => {
      if (resolved) return;
      outputBuffer += text;
      const port = extractPort(outputBuffer);
      if (port) {
        resolved = true;
        info.port = port;
        info.url = `http://localhost:${port}`;
        resolve(port);
      }
    };

    // Read stdout
    (async () => {
      const reader = proc.stdout.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          checkOutput(decoder.decode(value, { stream: true }));
        }
      } catch {
        // Process ended
      }
    })();

    // Read stderr (some servers output to stderr)
    (async () => {
      const reader = proc.stderr.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          checkOutput(decoder.decode(value, { stream: true }));
        }
      } catch {
        // Process ended
      }
    })();

    // Timeout after 15 seconds
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve(null);
      }
    }, 15000);
  });

  const port = await portPromise;

  // Open browser if we found a port
  if (port) {
    const url = `http://localhost:${port}`;
    try {
      // Use 'open' command on macOS
      Bun.spawn(['open', url], { stdout: 'ignore', stderr: 'ignore' });
    } catch {
      // Ignore browser open errors
    }
  }

  return { port: info.port, url: info.url };
}

/**
 * Stop a dev server for a RALPH instance
 */
export function stopDevServer(instanceId: string): boolean {
  const info = runningDevServers.get(instanceId);
  if (!info) {
    return false;
  }

  try {
    info.process.kill();
  } catch {
    // Process may have already exited
  }

  runningDevServers.delete(instanceId);
  return true;
}

/**
 * Get dev server status for a RALPH instance
 */
export function getDevServerStatus(instanceId: string): { running: boolean; port: number | null; url: string | null } {
  const info = runningDevServers.get(instanceId);
  if (!info) {
    return { running: false, port: null, url: null };
  }

  // Check if process is still running
  try {
    process.kill(info.process.pid, 0);
    return { running: true, port: info.port, url: info.url };
  } catch {
    // Process has exited
    runningDevServers.delete(instanceId);
    return { running: false, port: null, url: null };
  }
}

/**
 * Stop all dev servers (cleanup on shutdown)
 */
export function stopAllDevServers(): void {
  for (const [instanceId] of runningDevServers) {
    stopDevServer(instanceId);
  }
}
