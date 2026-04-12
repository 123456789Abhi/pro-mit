import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

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
