"use server";

import { createSupabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { z } from "zod";

// ─────────────────────────────────────────────
// Validation Schemas
// ─────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
});

const resetSchema = z.object({
  email: z.string().email("Invalid email address"),
});

// ─────────────────────────────────────────────
// Server Actions
// ─────────────────────────────────────────────

type ActionResult = { success: true } | { success: false; error: string };

export async function login(formData: FormData): Promise<ActionResult> {
  const raw = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid input" };
  }

  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { success: false, error: "Invalid email or password" };
  }

  // Middleware handles role-based redirect on next request
  return { success: true };
}

export async function signup(formData: FormData): Promise<ActionResult> {
  const raw = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    name: formData.get("name") as string,
  };

  const parsed = signupSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid input" };
  }

  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        name: parsed.data.name,
      },
    },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function logout(): Promise<void> {
  const supabase = await createSupabaseServer();
  await supabase.auth.signOut();
  redirect("/auth/login");
}

export async function resetPassword(formData: FormData): Promise<ActionResult> {
  const raw = { email: formData.get("email") as string };

  const parsed = resetSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid input" };
  }

  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Get current authenticated user with role info.
 * Used by server components to get user context.
 */
export async function getCurrentUser() {
  const supabase = await createSupabaseServer();

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {return null;}

  const { data: userData } = await supabase
    .from("users")
    .select("id, school_id, name, email, role, avatar_url, initials")
    .eq("id", user.id)
    .single();

  if (!userData) {return null;}

  return userData;
}
