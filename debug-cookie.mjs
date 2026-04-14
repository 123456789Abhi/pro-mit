// Debug: trace session state through all operations
const supabaseUrl = "https://czhrypodwcjyvfwsofit.supabase.co";
const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6aHJ5cG9kd2NqeXZmd3NvZml0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4NDQyMjAsImV4cCI6MjA5MTQyMDIyMH0.H6NigbZxnKYdkXnU410uy5r_f0d6GU5_Nt3t7XmaysE";

async function main() {
  const email = process.env.TEST_SUPER_ADMIN_EMAIL || "admin@lernen.edu";
  const password = process.env.TEST_SUPER_ADMIN_PASSWORD || "testpassword123";

  const authRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { 'apikey': anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const tokens = await authRes.json();
  if (!tokens.access_token) { console.log("Auth failed"); return; }
  console.log("Got tokens, sub:", tokens.user?.id);

  const { createClient } = await import('@supabase/supabase-js');

  // Sign in to get the exact session format
  const c0 = createClient(supabaseUrl, anonKey);
  const r0 = await c0.auth.signInWithPassword({ email, password });
  const session = r0.data.session;
  console.log("Session access_token:", !!session?.access_token);
  console.log("Session expires_at:", session?.expires_at);

  // Check session state after signInWithPassword
  const check = await c0.auth.getSession();
  console.log("\nAfter signInWithPassword, getSession():", !!check.data.session, check.error);

  const { createServerClient } = await import('@supabase/ssr');

  // Simulate what the middleware does: create SSR client with cookie
  const cookie = JSON.stringify(session);

  // Option A: raw session as cookie value
  const ssrA = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() { return [{ name: 'supabase.auth.token', value: cookie }]; },
      setAll() {},
    },
  });

  // Debug: manually check what _useSession sees
  console.log("\n--- Tracing _useSession ---");
  const ssrDebug = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() { return [{ name: 'supabase.auth.token', value: cookie }]; },
      setAll() {},
    },
  });

  // Get the session directly
  const debugSession = await ssrDebug.auth.getSession();
  console.log("getSession() result:", !!debugSession.data.session, debugSession.error?.message);
  console.log("getSession() session.access_token:", !!debugSession.data.session?.access_token);

  // Now the key question: does _getUser read the correct access_token?
  // In _getUser, it reads from data.session?.access_token
  // If getSession() returns the session with access_token, _getUser should work

  const debugUser = await ssrDebug.auth.getUser();
  console.log("getUser() result:", !!debugUser.data.user, debugUser.error?.message);

  // Test with a debug storage that shows what's being called
  console.log("\n--- Debug storage calls ---");
  const getAllCalls = [];
  const getAll = (keys) => {
    const result = [{ name: 'supabase.auth.token', value: cookie }];
    getAllCalls.push({ keys, result: result.map(c => c.name) });
    return result;
  };

  const ssrDebug2 = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll,
      setAll() {},
    },
  });

  const debugUser2 = await ssrDebug2.auth.getUser();
  console.log("getUser() result:", !!debugUser2.data.user, debugUser2.error?.message);
  console.log("getAll was called", getAllCalls.length, "times");
  getAllCalls.forEach((call, i) => {
    console.log(`  Call ${i+1}: keys=${JSON.stringify(call.keys)}, returned=${call.result.join(',')}`);
  });

  // The key: does getUser call _getUser with the cookie's token?
  // Check by inspecting if getUser(token) works
  console.log("\n--- Direct token validation ---");
  const parts = cookie.split('.');
  console.log("Cookie (first 100):", cookie.substring(0, 100));

  // Try with fresh client
  const freshClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // Set the session directly on the auth object
  const directSet = await freshClient.auth.setSession(session.access_token, session.refresh_token);
  console.log("setSession result:", !!directSet.data.session, directSet.error?.message);

  const directUser = await freshClient.auth.getUser();
  console.log("getUser after setSession:", !!directUser.data.user, directUser.error?.message);

  // Check what storage.getItem returns
  console.log("\n--- Inspecting storage adapter ---");
  const { createClient: cr } = await import('@supabase/supabase-js');
  const testClient = createClient(supabaseUrl, anonKey);

  // Try to call _getUser with the token
  // We need to access the private method through a workaround
  try {
    // Access _getUser through the auth client's methods
    const { data, error } = await testClient.auth.getUser(session.access_token);
    console.log("getUser(token) works:", !!data.user, "error:", error?.message);
  } catch (e) {
    console.log("Error:", e.message);
  }
}

main().catch(console.error);