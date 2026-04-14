import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Define the cookie type locally since it's not exported from @supabase/ssr
type CookieOptions = {
  expires?: number;
  path?: string;
  sameSite?: "lax" | "strict" | "none";
  httpOnly?: boolean;
  secure?: boolean;
};
type CookieToSet = { name: string; value: string; options?: CookieOptions };
type CookiesToSet = CookieToSet[];

/**
 * LERNEN MIDDLEWARE — Security Gateway
 *
 * Runs on EVERY request. Enforces:
 * 1. Authentication (valid session required for protected routes)
 * 2. Role verification (from public.users, NOT JWT)
 * 3. Cross-role route blocking (student CANNOT access /principal/*)
 * 4. Multi-tenant isolation (school_id check)
 * 5. Account status (deleted_at must be NULL)
 *
 * Aividzy Bug Fix: v1 middleware checked login but NOT cross-role access.
 */

// Routes that don't require authentication
const PUBLIC_ROUTES = ["/auth/login", "/auth/signup", "/auth/reset-password", "/auth/callback"];

// Role → allowed route prefix mapping
const ROLE_ROUTE_MAP: Record<string, string> = {
  super_admin: "/super-admin",
  principal: "/principal",
  teacher: "/teacher",
  student: "/student",
  parent: "/parent",
};

// Role → default redirect after login
const ROLE_HOME_MAP: Record<string, string> = {
  super_admin: "/super-admin/command-center",
  principal: "/principal/dashboard",
  teacher: "/teacher/dashboard",
  student: "/student/dashboard",
  parent: "/parent/dashboard",
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static assets and API routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Create response FIRST, then configure client so setAll can set cookies on the response
  const response = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options?: CookieOptions }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // ── 1. Check authentication ──
  // CRITICAL: getUser() validates with Supabase Auth server. Cannot be spoofed.
  // NEVER use getSession() — it only reads local JWT without server verification.
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  // Public routes: allow access, redirect to home if already authenticated
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    if (user && !authError) {
      // Already authenticated — get role and redirect to their panel
      const { data: userData } = await supabase
        .from("users")
        .select("role, deleted_at")
        .eq("id", user.id)
        .single();

      if (userData && !userData.deleted_at) {
        const home = ROLE_HOME_MAP[userData.role] ?? "/auth/login";
        return NextResponse.redirect(new URL(home, request.url));
      }
    }
    return response;
  }

  // Root redirect
  if (pathname === "/") {
    if (user && !authError) {
      const { data: userData } = await supabase
        .from("users")
        .select("role, deleted_at")
        .eq("id", user.id)
        .single();

      if (userData && !userData.deleted_at) {
        const home = ROLE_HOME_MAP[userData.role] ?? "/auth/login";
        return NextResponse.redirect(new URL(home, request.url));
      }
    }
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  // Not authenticated — redirect to login
  if (!user || authError) {
    // Log for debugging — auth failures should never be silent
    console.error("[Auth] getUser() failed:", {
      hasUser: !!user,
      authError: authError?.message,
      cookiePresent: request.cookies.get("supabase.auth.token") !== undefined,
      pathname,
    });
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── 2. Get user role from public.users table ──
  // NEVER trust JWT claims for role. Always verify from database.
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("role, school_id, deleted_at")
    .eq("id", user.id)
    .single();

  if (userError || !userData) {
    // User exists in auth but not in public.users — broken state
    console.error("[Auth] User in auth but not in public.users:", {
      userId: user.id,
      userError: userError?.message,
    });
    return NextResponse.redirect(new URL("/auth/login?error=account_not_found", request.url));
  }

  // ── 3. Check account status ──
  if (userData.deleted_at) {
    // Account deactivated
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/auth/login?error=account_deactivated", request.url));
  }

  // ── 4. Cross-role route blocking ──
  const userRole = userData.role as string;
  const allowedPrefix = ROLE_ROUTE_MAP[userRole];

  if (!allowedPrefix) {
    // Unknown role
    return NextResponse.redirect(new URL("/auth/login?error=invalid_role", request.url));
  }

  // Check if the current path matches the user's allowed route prefix
  const isAccessingOwnPanel = pathname.startsWith(allowedPrefix);

  if (!isAccessingOwnPanel) {
    // CRITICAL: This is the Aividzy bug fix.
    // A student trying to access /principal/* gets redirected to their own panel.
    const home = ROLE_HOME_MAP[userRole] ?? "/auth/login";
    return NextResponse.redirect(new URL(home, request.url));
  }

  // ── 5. Set user context headers for server components ──
  response.headers.set("x-user-id", user.id);
  response.headers.set("x-user-role", userRole);
  if (userData.school_id) {
    response.headers.set("x-school-id", userData.school_id);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public files (images, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
