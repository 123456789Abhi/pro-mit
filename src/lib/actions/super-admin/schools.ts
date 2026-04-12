"use server";

import { createSupabaseAdmin } from "@/lib/supabase/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { z } from "zod";
import type { PaginatedResult } from "@/lib/utils";

// ═══════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════

export type SchoolStatus =
  | "pending_onboarding"
  | "trial"
  | "active"
  | "expired"
  | "deactivated";

export interface School {
  id: string;
  name: string;
  board: string;
  city: string | null;
  region: string | null;
  ai_assistant_name: string;
  academic_year: string;
  logo_url: string | null;
  primary_color: string | null;
  status: SchoolStatus;
  deleted_at: string | null;
  created_at: string;
  // Aggregated metrics
  student_count: number;
  teacher_count: number;
  monthly_cost: number;
  monthly_revenue: number;
  ai_budget: number;
  ai_budget_used: number;
  ai_alert_threshold: number;
  ai_is_capped: boolean;
  ai_reset_day: number;
  price_per_student_monthly: number;
  min_billing_students: number;
  principal_id: string | null;
  principal_name: string | null;
  principal_email: string | null;
  last_active_at: string | null;
}

export interface SchoolFilters {
  search?: string;
  status?: SchoolStatus[];
  city?: string[];
  region?: string[];
  board?: string[];
  student_tier?: ("small" | "medium" | "large")[];
  pricing_tier?: ("economy" | "standard" | "premium")[];
  expiry_window?: ("overdue" | "this_week" | "this_month" | "three_months" | "six_months_plus")[];
  activity_level?: ("active" | "at_risk" | "dormant")[];
  growth?: ("growing" | "stable" | "declining")[];
  cursor?: string;
  pageSize?: number;
}

// ═══════════════════════════════════════════════════════
// VALIDATION SCHEMAS
// ═══════════════════════════════════════════════════════

const CreateSchoolSchema = z.object({
  // Step 1: School Info
  name: z.string().min(2).max(200),
  board: z.string().default("CBSE"),
  city: z.string().min(1).max(100),
  region: z.string().min(1).max(100),
  academic_year: z.string().regex(/^\d{4}-\d{4}$/),

  // Step 2: Principal Account
  principal_invite_option: z.enum(["invite", "create"]).default("invite"),
  principal_name: z.string().min(2).max(200),
  principal_email: z.string().email(),
  principal_phone: z.string().min(10).max(20),
  principal_employee_id: z.string().max(50).optional(),
  principal_password: z.string().min(8).max(128).optional(), // Required when invite_option = create

  // Step 3: Subscription
  subscription_plan: z.enum(["trial", "paid"]),
  subscription_duration: z.enum(["14_days", "1_month", "3_months", "6_months", "12_months", "custom"]),
  subscription_start_date: z.string(),
  subscription_expiry_date: z.string(),
  price_per_student_monthly: z.number().min(0).max(10000),
  min_billing_students: z.number().int().min(1).max(10000),

  // Step 4: AI Budget
  ai_monthly_budget: z.number().min(0).max(1000000).default(10000),
  ai_alert_threshold: z.number().min(50).max(99).default(80),
  ai_is_capped: z.boolean().default(false),
  ai_reset_day: z.number().int().min(1).max(28).default(1),

  // Step 5: Branding
  gini_name: z.string().min(1).max(50).default("GiNi"),
  logo_url: z.string().url().optional().or(z.literal("")),
  primary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#3b82f6"),

  // Step 6: Content
  auto_enable_all_books: z.boolean().default(true),
  enabled_book_ids: z.array(z.string()).optional(),
  enable_notes: z.boolean().default(true),
  enable_summaries: z.boolean().default(true),
  enable_faq: z.boolean().default(true),
  enable_quizzes: z.boolean().default(true),
  enable_drills: z.boolean().default(true),
});

export type CreateSchoolInput = z.infer<typeof CreateSchoolSchema>;

// ═══════════════════════════════════════════════════════
// HELPER: Get Admin Client
// ═══════════════════════════════════════════════════════

async function getAdminClient() {
  return createSupabaseAdmin();
}

async function getServerClient() {
  return createSupabaseServer();
}

// ═══════════════════════════════════════════════════════
// ACTION: Get All Schools (with filters & pagination)
// ═══════════════════════════════════════════════════════

export async function getSchools(
  filters: SchoolFilters
): Promise<PaginatedResult<School>> {
  const admin = await getAdminClient() as any;
  const pageSize = filters.pageSize ?? 50;

  try {
    // Build query with aggregations
    let query = admin
    .from("schools")
      .select(`
        *,
        principal:users!schools_created_by_fkey(id, name, email)
      `, { count: "exact" });

    // Status filter
    if (filters.status?.length) {
      query = query.in("status", filters.status);
    }

    // Search filter
    if (filters.search) {
      query = query.or(
        `name.ilike.%${filters.search}%,city.ilike.%${filters.search}%,region.ilike.%${filters.search}%`
      );
    }

    // Board filter
    if (filters.board?.length) {
      query = query.in("board", filters.board);
    }

    // City filter
    if (filters.city?.length) {
      query = query.in("city", filters.city);
    }

    // Region filter
    if (filters.region?.length) {
      query = query.in("region", filters.region);
    }

    // Exclude soft-deleted
    query = query.is("deleted_at", null);

    // Cursor pagination
    if (filters.cursor) {
      query = query.lt("created_at", filters.cursor);
    }

    query = query.order("created_at", { ascending: false }).limit(pageSize + 1);

    const { data: rawSchools, error, count } = await query as any;

    if (error) {
      throw new Error(`Failed to fetch schools: ${error.message}`);
    }

    // Fetch aggregated metrics for each school
    const schoolIds = (rawSchools as any[])?.map((s: any) => s.id) ?? [];
    let studentCounts: Record<string, number> = {};
    let teacherCounts: Record<string, number> = {};

    if (schoolIds.length > 0) {
      // Student counts
      const { data: studentData } = await admin
      .from("users")
        .select("school_id")
        .in("school_id", schoolIds)
        .eq("role", "student")
        .is("deleted_at", null);

      if (studentData) {
        studentCounts = (studentData as any[]).reduce((acc: Record<string, number>, u: any) => {
          acc[u.school_id!] = (acc[u.school_id!] ?? 0) + 1;
          return acc;
        }, {} as Record<string, number>);
      }

      // Teacher counts
      const { data: teacherData } = await admin
      .from("users")
        .select("school_id")
        .in("school_id", schoolIds)
        .eq("role", "teacher")
        .is("deleted_at", null);

      if (teacherData) {
        teacherCounts = (teacherData as any[]).reduce((acc: Record<string, number>, u: any) => {
          acc[u.school_id!] = (acc[u.school_id!] ?? 0) + 1;
          return acc;
        }, {} as Record<string, number>);
      }
    }

    // Build school objects with metrics
    const schools: School[] = (((rawSchools ?? []) as any[])).map((s: any) => {
      const principal = (s as Record<string, unknown>).principal as { id?: string; name?: string; email?: string } | null;
      return {
        id: s.id,
        name: s.name,
        board: s.board,
        city: s.city,
        region: s.region,
        ai_assistant_name: s.ai_assistant_name,
        academic_year: s.academic_year,
        logo_url: s.logo_url,
        primary_color: s.primary_color,
        status: s.status as SchoolStatus,
        deleted_at: s.deleted_at,
        created_at: s.created_at,
        student_count: studentCounts[s.id] ?? 0,
        teacher_count: teacherCounts[s.id] ?? 0,
        monthly_cost: 0, // Computed by background job
        monthly_revenue: 0, // Computed by background job
        ai_budget: 10000,
        ai_budget_used: 0,
        ai_alert_threshold: 80,
        ai_is_capped: false,
        ai_reset_day: 1,
        price_per_student_monthly: 100,
        min_billing_students: 1,
        principal_id: principal?.id ?? null,
        principal_name: principal?.name ?? null,
        principal_email: principal?.email ?? null,
        last_active_at: null,
      };
    });

    // Apply post-query filters
    let filtered = schools;

    // Student tier filter
    if (filters.student_tier?.length) {
      filtered = filtered.filter((s) => {
        if (filters.student_tier!.includes("small")) {return s.student_count <= 50;}
        if (filters.student_tier!.includes("medium")) {return s.student_count > 50 && s.student_count <= 200;}
        if (filters.student_tier!.includes("large")) {return s.student_count > 200;}
        return true;
      });
    }

    // Pricing tier filter
    if (filters.pricing_tier?.length) {
      filtered = filtered.filter((s) => {
        if (filters.pricing_tier!.includes("economy")) {return s.price_per_student_monthly < 50;}
        if (filters.pricing_tier!.includes("standard")) {return s.price_per_student_monthly >= 50 && s.price_per_student_monthly <= 150;}
        if (filters.pricing_tier!.includes("premium")) {return s.price_per_student_monthly > 150;}
        return true;
      });
    }

    // Pagination
    const hasMore = filtered.length > pageSize;
    const pageData = hasMore ? filtered.slice(0, pageSize) : filtered;
    const nextCursor = hasMore ? pageData[pageData.length - 1]?.created_at ?? null : null;

    return {
      data: pageData,
      nextCursor,
      prevCursor: null,
      hasMore,
      totalCount: typeof count === "number" ? count : filtered.length,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch schools";
    throw new Error(message);
  }
}

// ═══════════════════════════════════════════════════════
// ACTION: Get Single School
// ═══════════════════════════════════════════════════════

export async function getSchool(schoolId: string): Promise<School | null> {
  const admin = await getAdminClient() as any;

  const { data: school, error } = await admin
  .from("schools")
    .select("*")
    .eq("id", schoolId)
    .is("deleted_at", null)
    .single();

  if (error) {
    if (error.code === "PGRST116") {return null;} // Not found
    throw new Error(`Failed to fetch school: ${error.message}`);
  }

  // Fetch metrics
  const { count: studentCount } = await admin
  .from("users")
    .select("*", { count: "exact", head: true })
    .eq("school_id", schoolId)
    .eq("role", "student")
    .is("deleted_at", null);

  const { count: teacherCount } = await admin
  .from("users")
    .select("*", { count: "exact", head: true })
    .eq("school_id", schoolId)
    .eq("role", "teacher")
    .is("deleted_at", null);

  // Get principal
  const { data: principal } = await admin
  .from("users")
    .select("id, name, email")
    .eq("school_id", schoolId)
    .eq("role", "principal")
    .is("deleted_at", null)
    .single();

  return {
    id: school.id,
    name: school.name,
    board: school.board,
    city: school.city,
    region: school.region,
    ai_assistant_name: school.ai_assistant_name,
    academic_year: school.academic_year,
    logo_url: school.logo_url,
    primary_color: school.primary_color,
    status: school.status as SchoolStatus,
    deleted_at: school.deleted_at,
    created_at: school.created_at,
    student_count: studentCount ?? 0,
    teacher_count: teacherCount ?? 0,
    monthly_cost: 0,
    monthly_revenue: 0,
    ai_budget: 10000,
    ai_budget_used: 0,
    ai_alert_threshold: 80,
    ai_is_capped: false,
    ai_reset_day: 1,
    price_per_student_monthly: 100,
    min_billing_students: 1,
    principal_id: principal?.id ?? null,
    principal_name: principal?.name ?? null,
    principal_email: principal?.email ?? null,
    last_active_at: null,
  };
}

// ═══════════════════════════════════════════════════════
// ACTION: Get School Teams (users by role)
// ═══════════════════════════════════════════════════════

export async function getSchoolTeam(schoolId: string) {
  const admin = await getAdminClient() as any;

  const { data: users, error } = await admin
  .from("users")
    .select("id, name, email, role, avatar_url, initials, created_at")
    .eq("school_id", schoolId)
    .is("deleted_at", null)
    .order("role")
    .order("created_at");

  if (error) {
    throw new Error(`Failed to fetch school team: ${error.message}`);
  }

  return users;
}

// ═══════════════════════════════════════════════════════
// ACTION: Get Schools Summary Stats
// ═══════════════════════════════════════════════════════

export async function getSchoolsSummary() {
  const admin = await getAdminClient() as any;

  const { data: schools, error } = await admin
  .from("schools")
    .select("id, status, student_count, price_per_student_monthly")
    .is("deleted_at", null);

  if (error) {
    throw new Error(`Failed to fetch schools summary: ${error.message}`);
  }

  const schoolsTyped = (schools as any[]) ?? [];
  const total = schoolsTyped.length;
  const byStatus = {
    pending_onboarding: schoolsTyped.filter((s: any) => s.status === "pending_onboarding").length,
    trial: schoolsTyped.filter((s: any) => s.status === "trial").length,
    active: schoolsTyped.filter((s: any) => s.status === "active").length,
    expired: schoolsTyped.filter((s: any) => s.status === "expired").length,
    deactivated: schoolsTyped.filter((s: any) => s.status === "deactivated").length,
  };

  const totalStudents = schoolsTyped.reduce((sum: number, s: any) => sum + (s.student_count ?? 0), 0);

  return {
    total,
    byStatus,
    totalStudents,
    avgStudentsPerSchool: total > 0 ? Math.round(totalStudents / total) : 0,
  };
}

// ═══════════════════════════════════════════════════════
// ACTION: Create School
// ═══════════════════════════════════════════════════════

export async function createSchool(
  input: CreateSchoolInput
): Promise<{ success: true; schoolId: string } | { success: false; error: string }> {
  try {
    const validated = CreateSchoolSchema.parse(input);
    const admin = await getAdminClient() as any;

    // 1. Create the school
    const { data: school, error: schoolError } = await admin
    .from("schools")
      .insert({
        name: validated.name,
        board: validated.board,
        city: validated.city,
        region: validated.region,
        academic_year: validated.academic_year,
        ai_assistant_name: validated.gini_name,
        logo_url: validated.logo_url || null,
        primary_color: validated.primary_color,
        status: validated.subscription_plan === "trial" ? "trial" : "pending_onboarding",
      })
      .select()
      .single();

    if (schoolError) {
      return { success: false, error: `Failed to create school: ${schoolError.message}` };
    }

    const schoolId = school.id;

    // 2. Create principal account
    if (validated.principal_invite_option === "invite") {
      // Send invite via auth
      const { error: inviteError } = await admin.auth.admin.createUser({
        email: validated.principal_email,
        phone: validated.principal_phone,
        user_metadata: {
          name: validated.principal_name,
          school_id: schoolId,
          role: "principal",
          employee_id: validated.principal_employee_id ?? null,
        },
        email_redirect_to: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      });

      if (inviteError) {
        // Rollback school creation
        await admin.from("schools").update({ deleted_at: new Date().toISOString() }).eq("id", schoolId);
        return { success: false, error: `Failed to create principal account: ${inviteError.message}` };
      }
    } else {
      // Create directly with password
      const { error: createError } = await admin.auth.admin.createUser({
        email: validated.principal_email,
        phone: validated.principal_phone,
        password: validated.principal_password,
        user_metadata: {
          name: validated.principal_name,
          school_id: schoolId,
          role: "principal",
          employee_id: validated.principal_employee_id ?? null,
        },
      });

      if (createError) {
        // Rollback school creation
        await admin.from("schools").update({ deleted_at: new Date().toISOString() }).eq("id", schoolId);
        return { success: false, error: `Failed to create principal account: ${createError.message}` };
      }
    }

    return { success: true, schoolId };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { success: false, error: err.errors[0]?.message ?? "Invalid input" };
    }
    const message = err instanceof Error ? err.message : "Failed to create school";
    return { success: false, error: message };
  }
}

// ═══════════════════════════════════════════════════════
// ACTION: Update School Status
// ═══════════════════════════════════════════════════════

export async function updateSchoolStatus(
  schoolId: string,
  newStatus: SchoolStatus
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const admin = await getAdminClient() as any;

    const { error } = await admin
    .from("schools")
      .update({ status: newStatus })
      .eq("id", schoolId);

    if (error) {
      return { success: false, error: `Failed to update school status: ${error.message}` };
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update school status";
    return { success: false, error: message };
  }
}

// ═══════════════════════════════════════════════════════
// ACTION: Deactivate / Reactivate School
// ═══════════════════════════════════════════════════════

export async function deactivateSchool(
  schoolId: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const admin = await getAdminClient() as any;

    // Start transaction
    // 1. Set school to deactivated
    const { error: schoolError } = await admin
    .from("schools")
      .update({ status: "deactivated" })
      .eq("id", schoolId);

    if (schoolError) {
      return { success: false, error: `Failed to deactivate school: ${schoolError.message}` };
    }

    // 2. Soft-delete all users in the school
    const { error: usersError } = await admin
    .from("users")
      .update({ deleted_at: new Date().toISOString() })
      .eq("school_id", schoolId)
      .is("deleted_at", null);

    if (usersError) {
      return { success: false, error: `Failed to freeze users: ${usersError.message}` };
    }

    // 3. Cancel pending notifications
    const { error: notifError } = await admin
    .from("notifications")
      .update({ status: "cancelled" })
      .eq("school_id", schoolId)
      .in("status", ["scheduled", "draft"]);

    if (notifError) {
      // Non-critical - log but don't fail
      void notifError;
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to deactivate school";
    return { success: false, error: message };
  }
}

export async function reactivateSchool(
  schoolId: string
): Promise<{ success: true; previousStatus: SchoolStatus } | { success: false; error: string }> {
  try {
    const admin = await getAdminClient() as any;

    // Get the previous status from audit log or default to active
    const { data: auditEntry } = await admin
    .from("admin_audit_log")
      .select("changes")
      .eq("school_id", schoolId)
      .ilike("changes", "%deactivated%")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // Default to active on reactivation
    const previousStatus: SchoolStatus = "active";

    // 1. Restore school status
    const { error: schoolError } = await admin
    .from("schools")
      .update({ status: previousStatus })
      .eq("id", schoolId)
      .eq("status", "deactivated");

    if (schoolError) {
      return { success: false, error: `Failed to reactivate school: ${schoolError.message}` };
    }

    // 2. Restore all users
    const { error: usersError } = await admin
    .from("users")
      .update({ deleted_at: null })
      .eq("school_id", schoolId);

    if (usersError) {
      return { success: false, error: `Failed to unfreeze users: ${usersError.message}` };
    }

    // 3. Log the reactivation
    await admin.from("admin_audit_log").insert({
      school_id: schoolId,
      action: "school_reactivated",
      changes: JSON.stringify({ previous_status: previousStatus }),
    });

    return { success: true, previousStatus };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to reactivate school";
    return { success: false, error: message };
  }
}

// ═══════════════════════════════════════════════════════
// ACTION: Update School Details
// ═══════════════════════════════════════════════════════

const UpdateSchoolSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  city: z.string().min(1).max(100).optional(),
  region: z.string().min(1).max(100).optional(),
  academic_year: z.string().regex(/^\d{4}-\d{4}$/).optional(),
  ai_assistant_name: z.string().min(1).max(50).optional(),
  logo_url: z.string().url().optional().or(z.literal("")),
  primary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  price_per_student_monthly: z.number().min(0).max(10000).optional(),
  min_billing_students: z.number().int().min(1).max(10000).optional(),
  ai_monthly_budget: z.number().min(0).max(1000000).optional(),
  ai_alert_threshold: z.number().min(50).max(99).optional(),
  ai_is_capped: z.boolean().optional(),
  ai_reset_day: z.number().int().min(1).max(28).optional(),
});

export type UpdateSchoolInput = z.infer<typeof UpdateSchoolSchema>;

export async function updateSchool(
  schoolId: string,
  input: UpdateSchoolInput
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const validated = UpdateSchoolSchema.parse(input);
    const admin = await getAdminClient() as any;

    const { error } = await admin
    .from("schools")
      .update(validated)
      .eq("id", schoolId);

    if (error) {
      return { success: false, error: `Failed to update school: ${error.message}` };
    }

    return { success: true };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { success: false, error: err.errors[0]?.message ?? "Invalid input" };
    }
    const message = err instanceof Error ? err.message : "Failed to update school";
    return { success: false, error: message };
  }
}

// ═══════════════════════════════════════════════════════
// ACTION: Bulk Update School Status
// ═══════════════════════════════════════════════════════

export async function bulkUpdateSchoolStatus(
  schoolIds: string[],
  newStatus: SchoolStatus
): Promise<{ success: true; updatedCount: number } | { success: false; error: string }> {
  try {
    if (schoolIds.length === 0) {
      return { success: false, error: "No schools selected" };
    }

    const admin = await getAdminClient() as any;

    const { error } = await admin
    .from("schools")
      .update({ status: newStatus })
      .in("id", schoolIds);

    if (error) {
      return { success: false, error: `Failed to update schools: ${error.message}` };
    }

    return { success: true, updatedCount: schoolIds.length };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update schools";
    return { success: false, error: message };
  }
}

// ═══════════════════════════════════════════════════════
// ACTION: Impersonate Principal
// ═══════════════════════════════════════════════════════

export async function impersonatePrincipal(
  schoolId: string
): Promise<{ success: true; redirectUrl: string } | { success: false; error: string }> {
  try {
    const admin = await getAdminClient() as any;

    // Get the principal for this school
    const { data: principal, error } = await admin
    .from("users")
      .select("id, email")
      .eq("school_id", schoolId)
      .eq("role", "principal")
      .is("deleted_at", null)
      .single();

    if (error || !principal) {
      return { success: false, error: "Principal not found for this school" };
    }

    // Log impersonation
    await admin.from("admin_audit_log").insert({
      school_id: schoolId,
      action: "impersonation_started",
      changes: JSON.stringify({ target_user_id: principal.id }),
    });

    // Generate a temporary impersonation link
    // In production, this would create a time-limited session
    const redirectUrl = `/auth/impersonate?school=${schoolId}&user=${principal.id}`;

    return { success: true, redirectUrl };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to impersonate principal";
    return { success: false, error: message };
  }
}

// ═══════════════════════════════════════════════════════
// ACTION: Export Schools CSV
// ═══════════════════════════════════════════════════════

export async function exportSchoolsCsv(
  schoolIds?: string[]
): Promise<{ success: true; csv: string } | { success: false; error: string }> {
  try {
    const admin = await getAdminClient() as any;

    let query = admin
    .from("schools")
      .select("id, name, board, city, region, status, ai_assistant_name, academic_year, created_at")
      .is("deleted_at", null)
      .order("name");

    if (schoolIds?.length) {
      query = query.in("id", schoolIds);
    }

    const { data: schools, error } = await query;

    if (error) {
      return { success: false, error: `Failed to fetch schools: ${error.message}` };
    }

    const schoolsTyped = (schools as any[]) ?? [];

    // Build CSV
    const headers = [
      "ID",
      "Name",
      "Board",
      "City",
      "Region",
      "Status",
      "AI Assistant",
      "Academic Year",
      "Created At",
      "Student Count",
      "Teacher Count",
    ];

    const rows = schoolsTyped.map((s: any) => [
      s.id,
      `"${s.name}"`,
      s.board,
      s.city ?? "",
      s.region ?? "",
      s.status,
      s.ai_assistant_name,
      s.academic_year,
      s.created_at,
      s.student_count ?? 0,
      s.teacher_count ?? 0,
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    return { success: true, csv };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to export schools";
    return { success: false, error: message };
  }
}

// ═══════════════════════════════════════════════════════
// ACTION: Get Available Filters (for filter panels)
// ═══════════════════════════════════════════════════════

export async function getSchoolsFilterOptions() {
  const admin = await getAdminClient() as any;

  const { data: schools, error } = await admin
  .from("schools")
    .select("city, region, board, status, student_count, price_per_student_monthly")
    .is("deleted_at", null);

  if (error) {
    throw new Error(`Failed to fetch filter options: ${error.message}`);
  }

  const schoolsTyped = (schools as any[]) ?? [];

  // Extract unique values
  const cities = [...new Set(schoolsTyped.map((s: any) => s.city).filter(Boolean) as string[])].sort();
  const regions = [...new Set(schoolsTyped.map((s: any) => s.region).filter(Boolean) as string[])].sort();
  const boards = [...new Set(schoolsTyped.map((s: any) => s.board).filter(Boolean) as string[])].sort();
  const statuses = [...new Set(schoolsTyped.map((s: any) => s.status).filter(Boolean) as string[])];

  // Student tier counts
  const studentTiers = {
    small: schoolsTyped.filter((s: any) => (s.student_count ?? 0) <= 50).length,
    medium: schoolsTyped.filter((s: any) => (s.student_count ?? 0) > 50 && (s.student_count ?? 0) <= 200).length,
    large: schoolsTyped.filter((s: any) => (s.student_count ?? 0) > 200).length,
  };

  // Pricing tier counts
  const pricingTiers = {
    economy: schoolsTyped.filter((s: any) => (s.price_per_student_monthly ?? 0) < 50).length,
    standard: schoolsTyped.filter((s: any) => (s.price_per_student_monthly ?? 0) >= 50 && (s.price_per_student_monthly ?? 0) <= 150).length,
    premium: schoolsTyped.filter((s: any) => (s.price_per_student_monthly ?? 0) > 150).length,
  };

  return {
    cities,
    regions,
    boards,
    statuses: statuses as SchoolStatus[],
    studentTiers,
    pricingTiers,
  };
}
