import { createClient } from "@supabase/supabase-js";

async function main() {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "MISSING",
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? "MISSING"
  );

  console.log("URL:", process.env.NEXT_PUBLIC_SUPABASE_URL ? "OK" : "MISSING");
  console.log("KEY:", process.env.SUPABASE_SERVICE_ROLE_KEY ? "OK" : "MISSING");

  // Test DB
  const db = await admin.from("schools").select("id").limit(1);
  console.log("DB select:", JSON.stringify(db));

  // Test auth
  const auth = await admin.auth.admin.createUser({
    email: "debug-test@lernen.edu",
    password: "Test1234",
    email_confirm: true,
  });
  // Supabase v2 returns { data: { user }, error } or { data: null, error }
  const userEmail = (auth as unknown as { data?: { user?: { email?: string } } }).data?.user?.email;
  console.log("Auth:", JSON.stringify({ user: userEmail, error: auth.error?.message }));
}

main().catch(console.error);
