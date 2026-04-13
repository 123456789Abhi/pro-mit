/**
 * Global setup — runs before all Playwright tests.
 * Seeds test data so auth and page loads work.
 */
import { spawn } from "child_process";
import { promisify } from "util";
import { readFileSync } from "fs";

const execFile = promisify(require("child_process").execFile);

// Load env vars so the mjs seed script has access
try {
  const content = readFileSync(".env.local", "utf8");
  for (const line of content.split("\n")) {
    const t = line.trim();
    if (t && !t.startsWith("#")) {
      const eqIdx = t.indexOf("=");
      if (eqIdx > 0) {
        const key = t.substring(0, eqIdx);
        const value = t.substring(eqIdx + 1);
        if (!(key in process.env)) {
          process.env[key] = value;
        }
      }
    }
  }
} catch {
  // .env.local may not exist in CI
}

export default async () => {
  console.log("[global-setup] Seeding test data...");
  try {
    const { stdout, stderr, code } = await execFile("node", ["scripts/seed-test-data.mjs"], {
      timeout: 120000,
      cwd: process.cwd(),
      env: process.env,
    });
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    if (code !== 0) {
      console.warn("[global-setup] Seed exited with code " + code + " — continuing anyway (data may already exist)");
    } else {
      console.log("[global-setup] Seed complete.");
    }
  } catch (err) {
    console.error("[global-setup] Seed error:", err);
    console.warn("[global-setup] Continuing anyway...");
  }
};
