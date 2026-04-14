import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteHandler } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";

/**
 * Test-only login route for Playwright E2E tests.
 *
 * Sets the auth cookie with CORRECT base64-URL encoding that @supabase/ssr v0.5.2 expects.
 * Uses the browser client to call signInWithPassword — this fires onAuthStateChange
 * which triggers storage.setItem() → applyServerStorage() with proper base64- encoding.
 *
 * URL: GET /api/auth/test-login?role=super_admin
 * URL: GET /api/auth/test-login?email=user@test.com
 *
 * Returns: redirect to /super-admin/command-center (or the target panel)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const role = searchParams.get("role");
  const email = searchParams.get("email");
  const password =
    searchParams.get("password") ||
    process.env.TEST_SUPER_ADMIN_PASSWORD ||
    "testpassword123";

  // Default test users — must match scripts/seed-test-data.mjs
  const TEST_USERS: Record<string, { email: string; password: string; redirectTo: string }> = {
    super_admin: {
      email: process.env.TEST_SUPER_ADMIN_EMAIL ?? "admin@lernen.edu",
      password: process.env.TEST_SUPER_ADMIN_PASSWORD ?? "testpassword123",
      redirectTo: "/super-admin/command-center",
    },
    principal: {
      email: process.env.TEST_PRINCIPAL_EMAIL ?? "principal@oakridge.edu",
      password: process.env.TEST_PRINCIPAL_PASSWORD ?? "testpassword123",
      redirectTo: "/principal/dashboard",
    },
    teacher: {
      email: process.env.TEST_TEACHER_EMAIL ?? "teacher@oakridge.edu",
      password: process.env.TEST_TEACHER_PASSWORD ?? "testpassword123",
      redirectTo: "/teacher/dashboard",
    },
    student: {
      email: process.env.TEST_STUDENT_EMAIL ?? "student@oakridge.edu",
      password: process.env.TEST_STUDENT_PASSWORD ?? "testpassword123",
      redirectTo: "/student/dashboard",
    },
  };

  let targetEmail = email ?? "";
  let redirectTo = "/";

  if (role) {
    const userConfig = TEST_USERS[role];
    if (!userConfig) {
      return NextResponse.json(
        { error: `Unknown role: ${role}. Available: ${Object.keys(TEST_USERS).join(", ")}` },
        { status: 400 }
      );
    }
    targetEmail = userConfig.email;
    redirectTo = userConfig.redirectTo;
  }

  if (!targetEmail) {
    return NextResponse.json(
      { error: "Provide ?role=<role> or ?email=<email>" },
      { status: 400 }
    );
  }

  // Use route handler client — it properly sets the cookie via onAuthStateChange
  // with base64-URL encoding that createServerClient.getItem() expects in middleware.
  // The onAuthStateChange callback → applyServerStorage() → setAll() sets cookies
  // on the response (response.cookies.set() in Next.js), so the cookie is included
  // in the redirect response.
  const supabase = createSupabaseRouteHandler(request);

  const { data, error } = await supabase.auth.signInWithPassword({
    email: targetEmail,
    password,
  });

  if (error || !data.session) {
    console.error("[TestLogin] signInWithPassword failed:", {
      email: targetEmail,
      error: error?.message,
    });

    // Fallback: use admin client to look up user
    const admin = createSupabaseAdmin();
    const { data: authUser, error: adminError } = await admin.auth.admin.listUsers();

    if (adminError) {
      return NextResponse.json(
        { error: `Admin lookup failed: ${adminError.message}` },
        { status: 500 }
      );
    }

    const foundUser = authUser?.users.find((u) => u.email === targetEmail);
    if (!foundUser) {
      return NextResponse.json(
        {
          error: `User not found: ${targetEmail}. Run seed script first: node scripts/seed-test-data.mjs`,
        },
        { status: 404 }
      );
    }

    // Admin client confirmed user exists but signInWithPassword failed.
    // This might mean the password doesn't match.
    return NextResponse.json(
      {
        error: `Authentication failed for ${targetEmail}. Seed password: testpassword123. Error: ${error?.message}`,
      },
      { status: 401 }
    );
  }

  // signInWithPassword succeeded. The onAuthStateChange callback fired and
  // applyServerStorage() set the supabase.auth.token cookie on the response
  // with base64-URL encoding. The cookie is now in the redirect response.
  return NextResponse.redirect(new URL(redirectTo, request.url));
}
