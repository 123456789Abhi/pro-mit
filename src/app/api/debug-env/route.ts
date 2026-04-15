import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  return NextResponse.json({
    hasUrl: !!supabaseUrl,
    hasKey: !!serviceRoleKey,
    urlValue: supabaseUrl,
    keyLength: serviceRoleKey?.length ?? 0,
    keyFirst20: serviceRoleKey?.substring(0, 20),
    // Test with @supabase/supabase-js
    adminClientResult: !!supabaseUrl && !!serviceRoleKey
      ? await testAdminClient(supabaseUrl, serviceRoleKey)
      : "env missing",
  });
}

async function testAdminClient(url: string, key: string) {
  try {
    const admin = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const result = await admin.auth.signInWithPassword({
      email: "admin@lernen.edu",
      password: "testpassword123",
    });
    return {
      success: !!result.data,
      error: result.error?.message,
      userId: result.data?.user?.id,
      expiresAt: result.data?.session?.expires_at,
    };
  } catch (e: unknown) {
    return { success: false, error: String(e) };
  }
}
