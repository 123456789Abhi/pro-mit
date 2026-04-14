import { createServerClient, createBrowserClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "./database.types";
import type { NextRequest } from "next/server";

// Re-export school context for convenience
export { getSchoolContext, getSchoolId, hasRole, isSuperAdmin } from "@/lib/auth/school-context";
export type { SchoolContext, UserRole } from "@/lib/auth/school-context";

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
 * Creates a Supabase server client for Server Actions that need to wait for
 * session cookies to be written before returning (e.g., login, signup).
 *
 * Returns both the client AND a promise that resolves when session cookies
 * have been written to the response. Use `awaitPersistedSession()` after
 * sign-in operations to ensure cookies are set BEFORE returning.
 *
 * CRITICAL FIX: @supabase/ssr's onAuthStateChange fires ASYNCHRONOUSLY after
 * the server action returns. Without awaiting persistence, cookies are empty
 * on the next request (middleware reads empty cookies → redirect to login).
 */
export async function createSupabaseServerForAuth() {
  const cookieStore = await cookies();

  // Promise that resolves when the onAuthStateChange callback has written
  // session cookies to the response via setAll(). This is the key to fixing
  // the login → redirect → back to login loop.
  let resolvePersisted: () => void;
  const persistedPromise = new Promise<void>((r) => {
    resolvePersisted = r;
  });
  let storageApplied = false;

  const client = createServerClient<Database>(
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

  // Intercept onAuthStateChange to signal when cookies have been persisted.
  // The original callback is preserved so all other listeners still work.
  const originalOnAuthStateChange = client.auth.onAuthStateChange.bind(client.auth);
  client.auth.onAuthStateChange = (callback) => {
    return originalOnAuthStateChange(async (event, session) => {
      await callback(event, session);
      // After SIGNED_IN, TOKEN_REFRESHED, or USER_UPDATED events, cookies have
      // been written. Resolve the promise so the server action can return safely.
      if (
        !storageApplied &&
        (event === "SIGNED_IN" ||
          event === "TOKEN_REFRESHED" ||
          event === "USER_UPDATED")
      ) {
        storageApplied = true;
        resolvePersisted?.();
      }
    });
  };

  return {
    supabase: client,
    /**
     * Resolves once session cookies have been written to the response.
     * Call this AFTER signInWithPassword/signUp/etc. and BEFORE returning
     * from the server action.
     */
    awaitPersistedSession: async () => {
      if (storageApplied) return; // Already persisted
      await persistedPromise;
    },
  };
}

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
