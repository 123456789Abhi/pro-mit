/**
 * Setup script — creates required Supabase tables.
 * Run: npx tsx scripts/setup-supabase.ts
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://czhrypodwcjyvfwsofit.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6aHJ5cG9kd2NqeXZmd3NvZml0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTg0NDIyMCwiZXhwIjoyMDkxNDIwMjIwfQ.7iXOq_1sYQawXYK2wthXvC2Gl2mLp0FGiQajEZtoTRI";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function setup() {
  console.log("Setting up Supabase schema...");

  // Create users table
  const { error: usersError } = await admin.rpc("exec", {
    sql: `
      CREATE TABLE IF NOT EXISTS public.users (
        id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
        school_id UUID,
        email TEXT NOT NULL,
        name TEXT NOT NULL,
        initials TEXT,
        role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('super_admin', 'principal', 'teacher', 'student', 'parent')),
        avatar_url TEXT,
        deleted_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `,
  });

  if (usersError) {
    console.log("Note: RPC exec not available — trying raw SQL via pg...");
    // Alternative: try direct REST API approach
    console.log("Cannot create tables via service role client.");
    console.log("Please create the following tables in Supabase dashboard:");
    console.log("");
    console.log("CREATE TABLE public.users (");
    console.log("  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,");
    console.log("  school_id UUID,");
    console.log("  email TEXT NOT NULL,");
    console.log("  name TEXT NOT NULL,");
    console.log("  initials TEXT,");
    console.log("  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('super_admin', 'principal', 'teacher', 'student', 'parent')),");
    console.log("  avatar_url TEXT,");
    console.log("  deleted_at TIMESTAMPTZ,");
    console.log("  created_at TIMESTAMPTZ NOT NULL DEFAULT now()");
    console.log(");");
    console.log("");
    console.log("ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;");
    process.exit(1);
  }

  console.log("✓ Schema created successfully");
}

setup().catch(console.error);
