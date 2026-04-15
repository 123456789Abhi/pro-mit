/**
 * Comprehensive seed script for E2E tests.
 * Run: node scripts/seed-test-data.mjs
 *
 * Creates all test users (super_admin, principal, teacher, student) plus
 * school data (Oakridge school, classes, subscription).
 * Idempotent — safe to run multiple times.
 *
 * Uses fetch + Supabase REST API directly — bypasses @supabase/supabase-js
 * client which has auth issues with process.env in some Node environments.
 */
import { readFileSync } from "fs";

// ─── Config ────────────────────────────────────────────────────────────────────

// Parse .env.local directly and set on process.env (required for Supabase auth)
const env = {};
try {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const t = line.trim();
    if (t && !t.startsWith("#")) {
      const eqIdx = t.indexOf("=");
      if (eqIdx > 0) {
        const key = t.substring(0, eqIdx);
        const value = t.substring(eqIdx + 1);
        // Always set — .env.local takes precedence
        process.env[key] = value;
        env[key] = value;
      }
    }
  }
} catch {
  console.warn("Could not read .env.local — using process.env");
}

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "https://czhrypodwcjyvfwsofit.supabase.co";
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// ─── REST helpers ──────────────────────────────────────────────────────────────

const headers = () => ({
  apikey: SERVICE_ROLE_KEY,
  Authorization: "Bearer " + SERVICE_ROLE_KEY,
  "Content-Type": "application/json",
  Prefer: "return=representation",
});

async function restGet(path) {
  const res = await fetch(`${SUPABASE_URL}${path}`, { headers: headers() });
  const data = await res.json();
  return { status: res.status, data };
}

async function restPost(path, body) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

async function restPatch(path, body) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    method: "PATCH",
    headers: headers(),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

// ─── Test users ────────────────────────────────────────────────────────────────

const TEST_USERS = {
  super_admin: {
    email: env.TEST_SUPER_ADMIN_EMAIL || "admin@lernen.edu",
    password: env.TEST_SUPER_ADMIN_PASSWORD || "testpassword123",
    name: "Test Super Admin",
    initials: "SA",
    role: "super_admin",
    school_id: null,
  },
  principal: {
    email: env.TEST_PRINCIPAL_EMAIL || "principal@oakridge.edu",
    password: env.TEST_PRINCIPAL_PASSWORD || "testpassword123",
    name: "Ramaprashad Bhattacharya",
    initials: "RB",
    role: "principal",
    school_id: "11111111-1111-1111-1111-111111111111",
  },
  teacher: {
    email: env.TEST_TEACHER_EMAIL || "teacher@oakridge.edu",
    password: env.TEST_TEACHER_PASSWORD || "testpassword123",
    name: "Test Teacher",
    initials: "TT",
    role: "teacher",
    school_id: "11111111-1111-1111-1111-111111111111",
  },
  student: {
    email: env.TEST_STUDENT_EMAIL || "student@oakridge.edu",
    password: env.TEST_STUDENT_PASSWORD || "testpassword123",
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
  console.log("URL:", SUPABASE_URL ? "OK" : "MISSING");
  console.log("KEY:", SERVICE_ROLE_KEY ? "OK" : "MISSING");

  // Quick connectivity test
  const test = await restGet("/rest/v1/schools?select=id&limit=1");
  if (test.status !== 200) {
    console.error("Supabase connection FAILED:", test.status, JSON.stringify(test.data));
    process.exit(1);
  }
  console.log("Supabase connected. Schools found:", test.data?.length ?? 0);

  await ensureSchool();
  await ensureClasses();
  await ensureSubscription();

  for (const [key, user] of Object.entries(TEST_USERS)) {
    await seedUser(key, user);
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

async function ensureSchool() {
  console.log("[1/5] Ensuring demo school...");
  const schoolId = "11111111-1111-1111-1111-111111111111";
  const existing = await restGet(`/rest/v1/schools?id=eq.${schoolId}&select=id&limit=1`);
  if (existing.data?.length > 0) {
    console.log("     School already exists.");
    return;
  }
  const result = await restPost("/rest/v1/schools", {
    id: schoolId,
    name: "Oakridge International School",
    board: "CBSE",
    ai_assistant_name: "Lernen AI",
    academic_year: "2026-27",
    status: "active",
  });
  if (result.status >= 400) {
    console.error("  Failed to create school:", JSON.stringify(result.data));
  } else {
    console.log("  Created demo school.");
  }
}

async function ensureClasses() {
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
    const existing = await restGet(`/rest/v1/classes?id=eq.${cls.id}&select=id&limit=1`);
    if (existing.data?.length === 0) {
      await restPost("/rest/v1/classes", {
        ...cls,
        school_id: "11111111-1111-1111-1111-111111111111",
      });
    }
  }
  console.log("  Classes ready.");
}

async function ensureSubscription() {
  console.log("[3/5] Ensuring demo subscription...");
  const existing = await restGet(
    "/rest/v1/subscriptions?school_id=eq.11111111-1111-1111-1111-111111111111&select=id&limit=1"
  );
  if (existing.data?.length > 0) {
    console.log("  Subscription already exists.");
    return;
  }
  const result = await restPost("/rest/v1/subscriptions", {
    id: "ccccccccc-cccc-cccc-cccc-cccccccccc",
    school_id: "11111111-1111-1111-1111-111111111111",
    plan: "growth",
    status: "active",
    price_monthly_paise: 499900,
  });
  if (result.status >= 400) {
    console.error("  Failed:", JSON.stringify(result.data));
  } else {
    console.log("  Subscription created.");
  }
}

async function seedUser(key, user) {
  console.log("[4/5] Creating " + key + " user: " + user.email);

  // 1. Create auth user via auth API
  const authResult = await restPost("/auth/v1/admin/users", {
    email: user.email,
    password: user.password,
    email_confirm: true,
    user_metadata: { name: user.name },
  });

  let userId = null;
  let alreadyExisted = false;

  if (authResult.status === 200 || authResult.status === 201) {
    userId = authResult.data?.id ?? null;
    console.log("  Auth user created: " + userId);
  } else if (authResult.data?.msg?.includes("already been registered") ||
             authResult.data?.message?.includes("already been registered")) {
    alreadyExisted = true;
    // Look up user by email
    const allUsers = await restGet("/auth/v1/admin/users?page=1&per_page=50");
    const found = allUsers.data?.users?.find((u) => u.email === user.email);
    userId = found?.id ?? null;
    if (userId) console.log("  Auth user already exists: " + userId);
  } else {
    console.error("  Auth error: " + JSON.stringify(authResult.data));
    return;
  }

  if (!userId) {
    console.error("  Could not find or create user ID for " + user.email);
    return;
  }

  // 2. Upsert public.users record
  const upsertResult = await restPost("/rest/v1/users", {
    id: userId,
    email: user.email,
    name: user.name,
    initials: user.initials,
    role: user.role,
    school_id: user.school_id,
    deleted_at: null,
  });

  if (upsertResult.status >= 400 && upsertResult.status !== 409) {
    console.error("  Failed to upsert public.users:", JSON.stringify(upsertResult.data));
  } else {
    console.log("  " + key + " ready (id: " + userId + ")");
  }
}

// ─── Playwright globalSetup export ─────────────────────────────────────────────
// When run as globalSetup, Playwright requires a default export function
export default async () => {
  await main();
};

// Also support running as standalone
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
}
