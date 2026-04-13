/**
 * Comprehensive seed script for E2E tests.
 * Run: npx tsx scripts/seed-test-data.ts
 *
 * Creates all test users (super_admin, principal, teacher, student) plus
 * school data (Oakridge school, classes, subscription).
 * Idempotent — safe to run multiple times.
 */
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

// Load env vars from .env.local so the script works without --env-file flag
function loadEnvLocal() {
  try {
    const content = readFileSync(".env.local", "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx > 0) {
          const key = trimmed.substring(0, eqIdx);
          const value = trimmed.substring(eqIdx + 1);
          if (!(key in process.env)) {
            process.env[key] = value;
          }
        }
      }
    }
  } catch {
    // .env.local not found — use defaults or environment
  }
}

loadEnvLocal();

// ─── Config ────────────────────────────────────────────────────────────────────

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  "https://czhrypodwcjyvfwsofit.supabase.co";
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6aHJ5cG9kd2NqeXZmd3NvZml0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTg0NDIyMCwiZXhwIjoyMDkxNDIwMjIwfQ.7iXOq_1sYQawXYK2wthXvC2Gl2mLp0FGiQajEZtoTRI";

// Test credentials (override via env vars)
const TEST_USERS = {
  super_admin: {
    email: process.env.TEST_SUPER_ADMIN_EMAIL ?? "admin@lernen.edu",
    password: process.env.TEST_SUPER_ADMIN_PASSWORD ?? "testpassword123",
    name: "Test Super Admin",
    initials: "SA",
    role: "super_admin",
    school_id: null,
  },
  principal: {
    email: process.env.TEST_PRINCIPAL_EMAIL ?? "principal@oakridge.edu",
    password: process.env.TEST_PRINCIPAL_PASSWORD ?? "testpassword123",
    name: "Ramaprashad Bhattacharya",
    initials: "RB",
    role: "principal",
    school_id: "11111111-1111-1111-1111-111111111111",
  },
  teacher: {
    email: process.env.TEST_TEACHER_EMAIL ?? "teacher@oakridge.edu",
    password: process.env.TEST_TEACHER_PASSWORD ?? "testpassword123",
    name: "Test Teacher",
    initials: "TT",
    role: "teacher",
    school_id: "11111111-1111-1111-1111-111111111111",
  },
  student: {
    email: process.env.TEST_STUDENT_EMAIL ?? "student@oakridge.edu",
    password: process.env.TEST_STUDENT_PASSWORD ?? "testpassword123",
    name: "Rahul Sharma",
    initials: "RS",
    role: "student",
    school_id: "11111111-1111-1111-1111-111111111111",
  },
};

// ─── Seed logic ───────────────────────────────────────────────────────────────

async function main() {
  console.log("=".repeat(60));
  console.log("  LERNEN — E2E Test Data Seed Script");
  console.log("=".repeat(60));
  console.log();

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  await ensureSchool(admin);
  await ensureClasses(admin);
  await ensureSubscription(admin);
  for (const [key, user] of Object.entries(TEST_USERS)) {
    await seedUser(admin, key as keyof typeof TEST_USERS, user);
  }

  console.log();
  console.log("=".repeat(60));
  console.log("  All test data ready!");
  console.log("=".repeat(60));
  console.log();
  console.log("  Super Admin: ", TEST_USERS.super_admin.email);
  console.log("  Principal:    ", TEST_USERS.principal.email);
  console.log("  Teacher:     ", TEST_USERS.teacher.email);
  console.log("  Student:     ", TEST_USERS.student.email);
  console.log();
  console.log("  All passwords: ", TEST_USERS.super_admin.password);
  console.log();
  console.log("  Add to .env.local:");
  console.log("    TEST_SUPER_ADMIN_EMAIL=" + TEST_USERS.super_admin.email);
  console.log("    TEST_SUPER_ADMIN_PASSWORD=" + TEST_USERS.super_admin.password);
  console.log("    TEST_PRINCIPAL_EMAIL=" + TEST_USERS.principal.email);
  console.log("    TEST_PRINCIPAL_PASSWORD=" + TEST_USERS.principal.password);
  console.log("=".repeat(60));
}

async function ensureSchool(admin: SupabaseClient) {
  console.log("[1/5] Ensuring demo school...");
  const schoolId = "11111111-1111-1111-1111-111111111111";
  const { data } = await admin
    .from("schools")
    .select("id")
    .eq("id", schoolId)
    .maybeSingle();

  if (data) {
    console.log("     School already exists.");
    return;
  }

  const { error } = await admin.from("schools").insert({
    id: schoolId,
    name: "Oakridge International School",
    board: "CBSE",
    ai_assistant_name: "Lernen AI",
    academic_year: "2026-27",
    status: "active",
  });

  if (error) {
    console.error("  Failed to create school:", error.message);
  } else {
    console.log("  Created demo school.");
  }
}

async function ensureClasses(admin: SupabaseClient) {
  console.log("[2/5] Ensuring demo classes...");

  const classes = [
    { id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", name: "9-A", section: "A", class_num: 9, stream: null },
    { id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", name: "9-B", section: "B", class_num: 9, stream: null },
    { id: "cccccccc-cccc-cccc-cccc-cccccccccccc", name: "10-A", section: "A", class_num: 10, stream: null },
    { id: "dddddddd-dddd-dddd-dddd-dddddddddddd", name: "10-B", section: "B", class_num: 10, stream: null },
    { id: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee", name: "11-A", section: "A", class_num: 11, stream: "Science" },
    { id: "ffffffff-ffff-ffff-ffff-ffffffffffff", name: "11-B", section: "B", class_num: 11, stream: "Commerce" },
  ];

  for (const cls of classes) {
    const { data } = await admin
      .from("classes")
      .select("id")
      .eq("id", cls.id)
      .maybeSingle();

    if (!data) {
      await admin.from("classes").insert({
        ...cls,
        school_id: "11111111-1111-1111-1111-111111111111",
      });
    }
  }

  console.log("  Classes ready.");
}

async function ensureSubscription(admin: SupabaseClient) {
  console.log("[3/5] Ensuring demo subscription...");

  const { data } = await admin
    .from("subscriptions")
    .select("id")
    .eq("school_id", "11111111-1111-1111-1111-111111111111")
    .maybeSingle();

  if (data) {
    console.log("  Subscription already exists.");
    return;
  }

  await admin.from("subscriptions").insert({
    id: "ccccccccc-cccc-cccc-cccc-cccccccccc",
    school_id: "11111111-1111-1111-1111-111111111111",
    plan: "growth",
    status: "active",
    price_monthly_paise: 499900,
  });

  console.log("  Subscription created.");
}

async function seedUser(
  admin: SupabaseClient,
  key: keyof typeof TEST_USERS,
  user: (typeof TEST_USERS)[typeof key]
) {
  console.log("[4/5] Creating " + key + " user: " + user.email);

  let userId: string | null = null;
  let alreadyExisted = false;

  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email: user.email,
    password: user.password,
    email_confirm: true,
    user_metadata: { name: user.name },
  });

  if (authError) {
    if (authError.message.includes("already been registered")) {
      alreadyExisted = true;
      try {
        const { data: allUsers } = await admin.auth.admin.listUsers();
        const found = allUsers?.users.find((u) => u.email === user.email);
        userId = found?.id ?? null;
      } catch {
        userId = await getUserIdByEmail(user.email);
      }
    } else {
      console.error("  Auth error: " + authError.message);
      return;
    }
  } else {
    userId = authUser?.user?.id ?? null;
    console.log("  Auth user created: " + userId);
  }

  if (!userId) {
    console.error("  Could not find or create user ID for " + user.email);
    return;
  }

  if (alreadyExisted) {
    console.log("  Auth user already exists: " + userId);
  }

  const { error: upsertError } = await admin
    .from("users")
    .upsert(
      {
        id: userId,
        email: user.email,
        name: user.name,
        initials: user.initials,
        role: user.role,
        school_id: user.school_id,
        deleted_at: null,
      },
      { onConflict: "id" }
    );

  if (upsertError) {
    console.error("  Failed to upsert public.users: " + upsertError.message);
  } else {
    console.log("  " + key + " ready (id: " + userId + ")");
  }
}

async function getUserIdByEmail(email: string): Promise<string | null> {
  // Fallback: query auth.users via Supabase REST API using service role
  const url =
    `https://czhrypodwcjyvfwsofit.supabase.co/auth/v1/admin/users?page=1&per_page=50`;
  try {
    const res = await fetch(url, {
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: "Bearer " + SERVICE_ROLE_KEY,
      },
    });
    if (!res.ok) return null;
    const parsed = await res.json() as { users?: Array<{ id: string; email: string }> };
    const users = parsed.users ?? [];
    const found = users.find((u) => u.email === email);
    return found?.id ?? null;
  } catch {
    return null;
  }
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
