/**
 * Seed script to create a test super_admin user in Supabase.
 * Run: npx tsx scripts/seed-test-user.ts
 *
 * This creates a user in Supabase Auth + public.users table.
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://czhrypodwcjyvfwsofit.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6aHJ5cG9kd2NqeXZmd3NvZml0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTg0NDIyMCwiZXhwIjoyMDkxNDIwMjIwfQ.7iXOq_1sYQawXYK2wthXvC2Gl2mLp0FGiQajEZtoTRI";

console.log("SUPABASE_URL:", SUPABASE_URL);

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function seedTestUser() {
  const email = "admin@lernen.edu";
  const password = "testpassword123";
  const name = "Test Super Admin";

  console.log(`Creating test user: ${email}`);

  // 1. Create auth user
  let userId: string | null = null;

  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      name,
    },
  });

  if (authError) {
    if (authError.message.includes("already been registered")) {
      console.log("User already exists in auth — looking up by email...");
    } else {
      console.error("Auth error:", authError.message);
      process.exit(1);
    }
  } else {
    userId = authUser?.user?.id ?? null;
    console.log("Auth user created:", userId);
  }

  // If not set from create response, list all users to find by email
  if (!userId) {
    try {
      const { data: allUsers } = await admin.auth.admin.listUsers();
      const found = allUsers?.users.find((u) => u.email === email);
      if (found) {
        userId = found.id;
        console.log("Found existing auth user ID:", userId);
      }
    } catch (listErr) {
      console.warn("Could not list users:", listErr);
    }
  }

  if (!userId) {
    console.error("Could not find or create user ID");
    process.exit(1);
  }

  // 2. Create or update public.users record
  const { error: insertError } = await admin.from("users").upsert(
    {
      id: userId,
      email,
      name,
      initials: "SA",
      role: "super_admin",
      school_id: null,
      deleted_at: null,
    },
    { onConflict: "id" }
  );

  if (insertError) {
    console.error("users insert error:", insertError.message);
    process.exit(1);
  }

  console.log("✓ Test user created successfully");
  console.log(`  Email: ${email}`);
  console.log(`  Password: ${password}`);
  console.log(`  Role: super_admin`);
}

seedTestUser().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
