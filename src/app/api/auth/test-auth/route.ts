import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Force dynamic — must run fresh every time, never cached.
export const dynamic = "force-dynamic";

/**
 * Test-only authentication endpoint for Playwright E2E tests.
 *
 * This route is EXCLUDED from middleware auth checks (pathname.startsWith("/api")).
 *
 * Flow:
 * 1. Signs in via Supabase with anon key to get a VALID JWT session token
 * 2. Looks up user's role from public.users (read-only)
 * 3. Sets the auth cookie + x-user-role header in the redirect response
 * 4. Browser follows redirect to target panel with valid auth cookie
 *
 * Subsequent requests: middleware's getUser() validates the real JWT → succeeds.
 *
 * URL: GET /api/auth/test-auth?role=super_admin
 */

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

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const role = searchParams.get("role");
  const email = searchParams.get("email");
  const password =
    searchParams.get("password") ??
    process.env.TEST_SUPER_ADMIN_PASSWORD ??
    "testpassword123";

  // Resolve target user from role or email
  let targetEmail = email ?? "";
  let redirectTo = "/";

  if (role) {
    const userConfig = TEST_USERS[role];
    if (!userConfig) {
      return NextResponse.redirect(
        new URL(`/auth/login?error=unknown_role:${role}`, request.url),
        { status: 302 }
      );
    }
    targetEmail = userConfig.email;
    redirectTo = userConfig.redirectTo;
  }

  if (!targetEmail) {
    return NextResponse.redirect(
      new URL("/auth/login?error=provide_role_or_email", request.url),
      { status: 302 }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    console.error("[TestAuth] Missing env vars");
    return NextResponse.redirect(
      new URL("/auth/login?error=missing_env", request.url),
      { status: 302 }
    );
  }

  // Use ANON key for signInWithPassword — password auth always uses anon key
  const supabase = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: sessionData, error: signInError } =
    await supabase.auth.signInWithPassword({
      email: targetEmail,
      password,
    });

  if (signInError || !sessionData.session) {
    console.error("[TestAuth] signIn failed:", {
      email: targetEmail,
      error: signInError?.message,
    });
    return NextResponse.redirect(
      new URL(
        `/auth/login?error=auth_failed:${encodeURIComponent(signInError?.message ?? "unknown")}`,
        request.url
      ),
      { status: 302 }
    );
  }

  // Build auth cookie in Supabase SSR format
  // This is what createServerClient reads in middleware
  const { access_token, refresh_token, expires_in, expires_at } =
    sessionData.session;

  const cookiePayload = {
    currentSession: {
      access_token,
      refresh_token,
      expires_at,
      expires_in,
      token_type: "bearer",
      user: sessionData.session.user,
    },
    expiresAt: expires_at,
  };

  const cookieValue = Buffer.from(JSON.stringify(cookiePayload)).toString(
    "base64"
  );

  // Redirect to target panel with auth cookie
  const redirectResponse = NextResponse.redirect(
    new URL(redirectTo, request.url),
    { status: 302 }
  );

  // Set auth cookie — middleware reads via getUser() and validates real JWT
  redirectResponse.cookies.set("supabase.auth.token", cookieValue, {
    httpOnly: false, // SSR needs to read this
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: expires_in ?? 3600,
  });

  return redirectResponse;
}
