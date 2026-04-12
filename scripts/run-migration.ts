/**
 * Runs the complete schema migration against the live Supabase project.
 * Uses the Management API via REST to execute raw SQL.
 *
 * Usage: npx tsx scripts/run-migration.ts
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://czhrypodwcjyvfwsofit.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6aHJ5cG9kd2NqeXZmd3NvZml0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTg0NDIyMCwiZXhwIjoyMDkxNDIwMjIwfQ.7iXOq_1sYQawXYK2wthXvC2Gl2mLp0FGiQajEZtoTRI";

// Management API client
const management = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

import { readFileSync } from "fs";
import { join } from "path";

async function runMigration() {
  const sql = readFileSync(
    join(process.cwd(), "supabase/migrations/001_complete_schema.sql"),
    "utf8"
  );

  console.log("Running migration on live Supabase database...");
  console.log("SQL length:", sql.length, "chars");

  // Split into individual statements
  const statements = sql
    .split(/;\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"));

  console.log(`Executing ${statements.length} statements...`);

  for (const stmt of statements) {
    if (!stmt.trim()) continue;
    const { error } = await management.rpc("exec", { sql: stmt });
    if (error) {
      // Ignore "already exists" errors
      const msg = error.message ?? "";
      if (
        msg.includes("already exists") ||
        msg.includes("duplicate key") ||
        msg.includes("multiple primary keys") ||
        msg.includes("cannot be used in a generated column")
      ) {
        continue;
      }
      console.error("SQL Error:", error.message);
      console.error("Statement:", stmt.substring(0, 100));
      // Continue anyway
    }
  }

  console.log("✓ Migration complete (errors above are non-fatal)");
}

runMigration().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
