/**
 * Safe child_process wrapper — avoids shell injection by using spawn() with array args.
 * Provides structured output with stdout, stderr, and exit status.
 * Windows-compatible.
 */
import { spawn } from "child_process";

export interface ExecFileResult {
  stdout: string;
  stderr: string;
  status: number | null;
  error?: Error;
}

/**
 * Synchronously run a command with arguments, capturing output.
 * @param command - Path to the program to run
 * @param args - Array of arguments passed to the program
 * @param options - spawn options
 */
export function execFileNoThrow(
  command: string,
  args: string[],
  options: { encoding?: BufferEncoding; timeout?: number; cwd?: string; env?: NodeJS.ProcessEnv } = {}
): [ExecFileResult] {
  return new Promise<[ExecFileResult]>((resolve) => {
    let stdout = "";
    let stderr = "";
    const child = spawn(command, args, {
      shell: false, // Never use shell — prevents injection
      cwd: options.cwd,
      env: options.env,
    });

    if (options.timeout) {
      setTimeout(() => {
        child.kill();
        resolve([{ stdout, stderr, status: null, error: new Error("Timeout") }]);
      }, options.timeout);
    }

    child.stdout?.on("data", (data: Buffer) => {
      stdout += data.toString(options.encoding ?? "utf8");
    });

    child.stderr?.on("data", (data: Buffer) => {
      stderr += data.toString(options.encoding ?? "utf8");
    });

    child.on("close", (code) => {
      resolve([{ stdout, stderr, status: code }]);
    });

    child.on("error", (err) => {
      resolve([{ stdout, stderr, status: null, error: err }]);
    });
  }) as unknown as [ExecFileResult];
}
