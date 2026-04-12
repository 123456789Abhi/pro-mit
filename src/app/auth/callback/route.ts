import { createSupabaseRouteHandler } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Auth callback handler.
 * Supabase redirects here after email confirmation or OAuth login.
 * Exchanges the auth code for a session, then redirects to the user's panel.
 *
 * BUG FIX: Was using createSupabaseServer() which uses cookies() from next/headers —
 * that creates a read-only cookie jar that doesn't see the incoming request's cookies.
 * Now uses createSupabaseRouteHandler(request) which reads cookies from the actual Request.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirectTo = searchParams.get("redirectTo") ?? "/";

  if (code) {
    const supabase = createSupabaseRouteHandler(request);
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Middleware will handle role-based redirect on the next request
      return NextResponse.redirect(`${origin}${redirectTo}`);
    }
  }

  // Auth failed — redirect to login with error
  return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_failed`);
}
