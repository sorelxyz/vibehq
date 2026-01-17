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

  const result = await Promise.race([
    (async () => {
      const [stdout, stderr, exitCode] = await Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
        proc.exited,
      ]);
      return { stdout, stderr, exitCode };
    })(),
    new Promise<never>((_, reject) => {
      setTimeout(() => {
        proc.kill();
        reject(new Error(`Command timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    }),
  ]);

  return result;
}
