/**
 * School Context — First-class tenant context for LERNEN
 *
 * Middleware sets x-user-id, x-user-role, x-school-id headers on every request.
 * This module consumes those headers and provides a typed SchoolContext to
 * all server components and server actions.
 *
 * Pattern from Clerk's auth().orgId + Logto's org-scoped context.
 * Never trusts client-supplied school_id — always server-verified.
 */

import { headers } from "next/headers";

export type UserRole = "super_admin" | "principal" | "teacher" | "student" | "parent";

export interface SchoolContext {
  userId: string;
  /** From public.users.role — verified from DB by middleware (NOT JWT metadata) */
  role: UserRole;
  /** null for super_admin (they manage all schools) */
  schoolId: string | null;
  isAuthenticated: true;
}

/**
 * Get the current request's school context from middleware-set headers.
 * Use this in all server actions and server components instead of
 * accepting school_id as a parameter from client code.
 *
 * @throws Error if headers are missing (should never happen if middleware ran)
 *
 * @example
 * // ✅ CORRECT — server-verified school_id
 * export async function getStudents() {
 *   const { userId, role, schoolId } = await getSchoolContext();
 *   const supabase = await createSupabaseServer();
 *   return supabase.from("students").select("*").eq("school_id", schoolId);
 * }
 *
 * @example
 * // ❌ WRONG — client can spoof school_id
 * export async function getStudents(schoolId: string) {
 *   return supabase.from("students").select("*").eq("school_id", schoolId);
 * }
 */
export async function getSchoolContext(): Promise<SchoolContext> {
  const headersList = await headers();
  const userId = headersList.get("x-user-id");
  const role = headersList.get("x-user-role") as UserRole | null;
  const schoolId = headersList.get("x-school-id");

  if (!userId || !role) {
    throw new Error(
      "SchoolContext unavailable — authentication headers not set. " +
        "Ensure middleware.ts is running and sets x-user-id, x-user-role headers."
    );
  }

  // Validate role against known types
  const validRoles: UserRole[] = ["super_admin", "principal", "teacher", "student", "parent"];
  if (!validRoles.includes(role)) {
    throw new Error(`Invalid role in SchoolContext: ${role}`);
  }

  return {
    userId,
    role,
    schoolId: schoolId ?? null,
    isAuthenticated: true,
  };
}

/**
 * Get only the school ID — shorthand for when you only need the tenant.
 * Returns null for super_admin (they have no single school context).
 */
export async function getSchoolId(): Promise<string | null> {
  const { schoolId } = await getSchoolContext();
  return schoolId;
}

/**
 * Check if the current user has a specific role.
 * Useful for conditional rendering and UI logic.
 */
export async function hasRole(role: UserRole): Promise<boolean> {
  const { role: currentRole } = await getSchoolContext();
  return currentRole === role;
}

/**
 * Check if the current user is a super_admin.
 * Super admins bypass RLS and can access any school.
 */
export async function isSuperAdmin(): Promise<boolean> {
  return hasRole("super_admin");
}