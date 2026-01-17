export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export async function exec(
  command: string,
  options?: { cwd?: string; timeout?: number }
): Promise<ExecResult> {
  const proc = Bun.spawn(['bash', '-c', command], {
    cwd: options?.cwd,
    stdout: 'pipe',
    stderr: 'pipe',
  });

  const timeoutMs = options?.timeout || 60000;
  let timedOut = false;

  const timeoutId = setTimeout(() => {
    timedOut = true;
    proc.kill();
  }, timeoutMs);

  try {
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);

    clearTimeout(timeoutId);

    if (timedOut) {
      throw new Error(`Command timed out after ${timeoutMs}ms`);
    }

    return { stdout, stderr, exitCode };
  } catch (error) {
    clearTimeout(timeoutId);
    if (timedOut) {
      throw new Error(`Command timed out after ${timeoutMs}ms`);
    }
    throw error;
  }
}
