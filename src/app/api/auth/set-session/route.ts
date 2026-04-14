import { NextRequest, NextResponse } from "next/server";

/**
 * Sets Supabase auth cookie in the browser via a 200 OK response with Set-Cookie header.
 * Playwright can access response headers, then set the cookie manually in the browser context.
 *
 * URL: GET /api/auth/set-session?token=<access_token>&refresh=<refresh_token>
 * Returns: { success: true } with Set-Cookie header
 *
 * How it works:
 * 1. Test navigates to this endpoint
 * 2. We set the cookie on a 200 response (not a redirect, so Playwright can see it)
 * 3. Test reads the cookie value and sets it via page.context().addCookies()
 * 4. Test navigates to / — middleware reads cookie → redirect to /super-admin
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const refreshToken = request.nextUrl.searchParams.get("refresh");

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  // @supabase/ssr v0.5.2 expects "supabase.auth.token" cookie with JSON:
  // { currentSession: { access_token, refresh_token, ... }, expiresAt }
  const expiresAt = Math.floor(Date.now() / 1000) + 3600;
  const cookieValue = JSON.stringify({
    currentSession: {
      access_token: token,
      refresh_token: refreshToken || "",
      expires_at: expiresAt,
      expires_in: 3600,
      token_type: "bearer",
      user: null,
    },
    expiresAt,
  });

  const response = NextResponse.json({ success: true, cookieName: "supabase.auth.token" });

  response.cookies.set("supabase.auth.token", cookieValue, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    secure: false,
    maxAge: 3600,
  });

  return response;
}