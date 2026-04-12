import { createServerClient, createBrowserClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "./database.types";
import type { NextRequest } from "next/server";

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
 * Creates a Supabase server client for Server Components and Server Actions.
 * Uses the ANON key — RLS policies enforce access control.
 *
 * CRITICAL: This uses getUser() internally via RLS.
 * NEVER use the service role key in server components.
 */
export async function createSupabaseServer() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options?: CookieOptions }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // setAll can fail in Server Components (read-only context).
            // This is expected — cookies can only be set in Server Actions or Route Handlers.
          }
        },
      },
    }
  );
}

/**
 * Creates a Supabase admin client for server-side operations
 * that bypass RLS (e.g., Edge Functions, background jobs).
 *
 * NEVER import this in client components or server components.
 * ONLY use in: Server Actions, Edge Functions, API Routes.
 */
export function createSupabaseAdmin() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

/**
 * Creates a Supabase server client for Route Handlers (API routes).
 * Passes the Next.js Request object so incoming cookies are read correctly.
 *
 * Use this for: Route Handlers (app/api/*).
 * For Server Components: use createSupabaseServer() instead.
 */
export function createSupabaseRouteHandler(request: NextRequest) {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
        },
      },
    }
  );
}

/**
 * Creates a Supabase browser client for Client Components.
 * Used for: real-time subscriptions, auth state listeners.
 *
 * NEVER use for data fetching — Server Components handle that.
 * NEVER use admin client in the browser — that's a security hole.
 */
export function createSupabaseBrowser() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
