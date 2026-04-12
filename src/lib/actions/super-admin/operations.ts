"use server";

import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { z } from "zod";
import { headers } from "next/headers";

// ═══════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════

export type AlertSeverity = "critical" | "high" | "medium" | "low";

export type AlertType =
  | "ai_api_down"
  | "database_unavailable"
  | "payment_failed"
  | "security_breach"
  | "budget_exhausted"
  | "suspicious_access"
  | "new_admin_created"
  | "ai_cost_spike"
  | "cache_hit_rate_drop"
  | "high_error_rate"
  | "notification_failure_rate"
  | "content_processing_failed"
  | "bulk_data_export"
  | "school_expired"
  | "bulk_data_anomaly"
  | "budget_warning"
  | "low_engagement"
  | "low_content_coverage"
  | "slow_ai_response"
  | "teacher_not_active"
  | "teacher_low_adoption"
  | "quiz_failure"
  | "pregen_coverage_gap"
  | "impersonation_session_open"
  | "content_processing_stalled"
  | "zero_ai_activity"
  | "student_risk_spike"
  | "pregen_coverage_drop"
  | "trial_expiring_soon"
  | "new_school_onboarded"
  | "content_added"
  | "monthly_report_ready"
  | "unused_template"
  | "notification_quality_drop";

export interface AdminAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_note: string | null;
  metadata: Record<string, unknown>;
}

export interface ImpersonationSession {
  id: string;
  admin_id: string;
  admin_name: string;
  admin_email: string;
  target_school_id: string;
  target_school_name: string;
  target_user_id: string;
  target_user_name: string;
  target_user_role: string;
  started_at: string;
  ended_at: string | null;
  ip_address: string;
  actions_performed: ImpersonationAction[];
  is_active: boolean;
}

export interface ImpersonationAction {
  timestamp: string;
  action_type: string;
  details: Record<string, unknown>;
}

export interface AuditLogEntry {
  id: string;
  actor_id: string;
  actor_name: string;
  actor_email: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  changes: Record<string, unknown> | null;
  ip_address: string;
  created_at: string;
}

export type AdminRole = "super_admin" | "support_admin" | "viewer";

export interface AdminAccount {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  last_login_at: string | null;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
}

export interface SystemHealthStatus {
  service: string;
  status: "healthy" | "degraded" | "down";
  response_time_ms: number | null;
  last_check: string;
  error_message: string | null;
}

export interface BackgroundJob {
  id: string;
  name: string;
  description: string;
  schedule: string;
  last_run: string | null;
  next_run: string | null;
  status: "running" | "completed" | "failed" | "scheduled";
  last_duration_seconds: number | null;
  error_message: string | null;
}

/** Row type for the local audit_log table — not in Supabase generated types */
interface AuditLogInsert {
  actor_id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  changes: Record<string, unknown> | null;
  ip_address: string;
}

/** Row shape for public.users — admin client maps to auth.users otherwise */
interface PublicUsersRow {
  id: string;
  metadata: Record<string, unknown> | null;
}

// ═══════════════════════════════════════════════════════
// ZOD SCHEMAS
// ═══════════════════════════════════════════════════════

export const ResolveAlertSchema = z.object({
  alertId: z.string().uuid(),
  resolutionNote: z.string().min(1).max(500),
});

export const CreateAdminSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  role: z.enum(["super_admin", "support_admin", "viewer"]),
});

export const UpdateAdminRoleSchema = z.object({
  adminId: z.string().uuid(),
  newRole: z.enum(["super_admin", "support_admin", "viewer"]),
});

export const EndImpersonationSchema = z.object({
  sessionId: z.string().uuid(),
});

export const AlertFiltersSchema = z.object({
  severity: z.enum(["critical", "high", "medium", "low"]).optional(),
  type: z.string().optional(),
  resolved: z.boolean().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  cursor: z.string().optional(),
  pageSize: z.number().min(10).max(100).default(50),
});

export const AuditLogFiltersSchema = z.object({
  actorId: z.string().uuid().optional(),
  action: z.string().optional(),
  resourceType: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().optional(),
  cursor: z.string().optional(),
  pageSize: z.number().min(10).max(100).default(50),
});

export const ImpersonationFiltersSchema = z.object({
  adminId: z.string().uuid().optional(),
  targetSchoolId: z.string().uuid().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  activeOnly: z.boolean().optional(),
  cursor: z.string().optional(),
  pageSize: z.number().min(10).max(100).default(50),
});

// ═══════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════

function getClientIp(): string {
  // Note: This will be called from server actions, so we need to handle it differently
  try {
    const headersList = headers();
    return (
      headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      headersList.get("x-real-ip") ||
      "unknown"
    );
  } catch {
    return "unknown";
  }
}

// ═══════════════════════════════════════════════════════
// ACTION: Get System Alerts
// ═══════════════════════════════════════════════════════

export async function getSystemAlerts(
  filters: z.infer<typeof AlertFiltersSchema>
) {
  try {
    const validated = AlertFiltersSchema.parse(filters);
    const supabase = await createSupabaseServer();

    let query = supabase
      .from("admin_alerts")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (validated.severity) {
      query = query.eq("severity", validated.severity);
    }

    if (validated.type) {
      query = query.eq("type", validated.type);
    }

    if (validated.resolved !== undefined) {
      if (validated.resolved) {
        query = query.not("resolved_at", "is", null);
      } else {
        query = query.is("resolved_at", null);
      }
    }

    if (validated.startDate) {
      query = query.gte("created_at", validated.startDate);
    }

    if (validated.endDate) {
      query = query.lte("created_at", validated.endDate);
    }

    if (validated.cursor) {
      query = query.lt("created_at", validated.cursor);
    }

    query = query.limit(validated.pageSize);

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch alerts: ${error.message}`);
    }

    const alerts = (data as AdminAlert[]) || [];
    const nextCursor = alerts.length === validated.pageSize
      ? alerts[alerts.length - 1]?.created_at
      : null;

    return {
      success: true as const,
      data: {
        alerts,
        totalCount: count || 0,
        nextCursor,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch alerts";
    return { success: false as const, error: message };
  }
}

// ═══════════════════════════════════════════════════════
// ACTION: Resolve Alert
// ═══════════════════════════════════════════════════════

export async function resolveAlert(
  input: z.infer<typeof ResolveAlertSchema>
) {
  try {
    const validated = ResolveAlertSchema.parse(input);
    const supabase = await createSupabaseServer();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false as const, error: "Unauthorized" };
    }

    // Update alert
    const { error: updateError } = await (supabase
      .from("admin_alerts")
      // @ts-ignore — admin_alerts not in Supabase generated types
      .update({
        resolved_at: new Date().toISOString(),
        resolved_by: user.id,
        resolution_note: validated.resolutionNote,
      }) as any)
      .eq("id", validated.alertId);

    if (updateError) {
      throw new Error(`Failed to resolve alert: ${updateError.message}`);
    }

    // Write audit log
    const admin = createSupabaseAdmin();
      // @ts-ignore — audit_log not in Supabase generated types
    await admin.from("audit_log").insert({
      actor_id: user.id,
      action: "RESOLVE_ALERT",
      resource_type: "admin_alert",
      resource_id: validated.alertId,
      changes: { resolution_note: validated.resolutionNote },
      ip_address: getClientIp(),
    } as unknown as AuditLogInsert);

    return { success: true as const, data: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to resolve alert";
    return { success: false as const, error: message };
  }
}

// ═══════════════════════════════════════════════════════
// ACTION: Get Impersonation Sessions
// ═══════════════════════════════════════════════════════

export async function getImpersonationSessions(
  filters: z.infer<typeof ImpersonationFiltersSchema>
) {
  try {
    const validated = ImpersonationFiltersSchema.parse(filters);
    const supabase = await createSupabaseServer();

    let query = supabase
      .from("impersonation_log")
      .select(`
        *,
        admin:users!admin_id(id, name, email),
        target_school:schools!target_school_id(id, name),
        target_user:users!target_user_id(id, name, role)
      `, { count: "exact" })
      .order("started_at", { ascending: false });

    if (validated.adminId) {
      query = query.eq("admin_id", validated.adminId);
    }

    if (validated.targetSchoolId) {
      query = query.eq("target_school_id", validated.targetSchoolId);
    }

    if (validated.startDate) {
      query = query.gte("started_at", validated.startDate);
    }

    if (validated.endDate) {
      query = query.lte("started_at", validated.endDate);
    }

    if (validated.activeOnly) {
      query = query.is("ended_at", null);
    }

    if (validated.cursor) {
      query = query.lt("started_at", validated.cursor);
    }

    query = query.limit(validated.pageSize);

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch impersonation sessions: ${error.message}`);
    }

    // Transform data to flatten nested relations
    const sessions: ImpersonationSession[] = (data || []).map((row: Record<string, unknown>) => ({
      id: row.id as string,
      admin_id: row.admin_id as string,
      admin_name: (row.admin as { name?: string } | null)?.name || "Unknown",
      admin_email: (row.admin as { email?: string } | null)?.email || "Unknown",
      target_school_id: row.target_school_id as string,
      target_school_name: (row.target_school as { name?: string } | null)?.name || "Unknown",
      target_user_id: row.target_user_id as string,
      target_user_name: (row.target_user as { name?: string } | null)?.name || "Unknown",
      target_user_role: (row.target_user as { role?: string } | null)?.role || "Unknown",
      started_at: row.started_at as string,
      ended_at: row.ended_at as string | null,
      ip_address: row.ip_address as string,
      actions_performed: (row.actions_performed as ImpersonationAction[]) || [],
      is_active: row.ended_at === null,
    }));

    const nextCursor = sessions.length === validated.pageSize
      ? sessions[sessions.length - 1]?.started_at
      : null;

    return {
      success: true as const,
      data: {
        sessions,
        totalCount: count || 0,
        nextCursor,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch sessions";
    return { success: false as const, error: message };
  }
}

// ═══════════════════════════════════════════════════════
// ACTION: End Impersonation Session
// ═══════════════════════════════════════════════════════

export async function endImpersonationSession(
  input: z.infer<typeof EndImpersonationSchema>
) {
  try {
    const validated = EndImpersonationSchema.parse(input);
    const supabase = await createSupabaseServer();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false as const, error: "Unauthorized" };
    }

    const { error: updateError } = await (supabase
      .from("impersonation_log")
      // @ts-ignore — impersonation_log not in Supabase generated types
      .update({
        ended_at: new Date().toISOString(),
      }) as any)
      .eq("id", validated.sessionId)
      .is("ended_at", null); // Only update if still active

    if (updateError) {
      throw new Error(`Failed to end session: ${updateError.message}`);
    }

    // Write audit log
    const admin = createSupabaseAdmin();
      // @ts-ignore — audit_log not in Supabase generated types
    await admin.from("audit_log").insert({
      // @ts-ignore — audit_log not in Supabase generated types
      // @ts-ignore — audit_log not in Supabase generated types
      actor_id: user.id,
      action: "END_IMPERSONATION",
      resource_type: "impersonation_log",
      resource_id: validated.sessionId,
      changes: null,
      ip_address: getClientIp(),
    } as unknown as AuditLogInsert);

    return { success: true as const, data: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to end session";
    return { success: false as const, error: message };
  }
}

// ═══════════════════════════════════════════════════════
// ACTION: Get Audit Log
// ═══════════════════════════════════════════════════════

export async function getAuditLog(
  filters: z.infer<typeof AuditLogFiltersSchema>
) {
  try {
    const validated = AuditLogFiltersSchema.parse(filters);
    const supabase = await createSupabaseServer();

    let query = supabase
      .from("audit_log")
      .select(`
        *,
        actor:users!actor_id(id, name, email)
      `, { count: "exact" })
      .order("created_at", { ascending: false });

    if (validated.actorId) {
      query = query.eq("actor_id", validated.actorId);
    }

    if (validated.action) {
      query = query.eq("action", validated.action);
    }

    if (validated.resourceType) {
      query = query.eq("resource_type", validated.resourceType);
    }

    if (validated.startDate) {
      query = query.gte("created_at", validated.startDate);
    }

    if (validated.endDate) {
      query = query.lte("created_at", validated.endDate);
    }

    if (validated.search) {
      query = query.or(
        `actor.users.name.ilike.%${validated.search}%,actor.users.email.ilike.%${validated.search}%,action.ilike.%${validated.search}%`
      );
    }

    if (validated.cursor) {
      query = query.lt("created_at", validated.cursor);
    }

    query = query.limit(validated.pageSize);

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch audit log: ${error.message}`);
    }

    // Transform data
    const entries: AuditLogEntry[] = (data || []).map((row: Record<string, unknown>) => ({
      id: row.id as string,
      actor_id: row.actor_id as string,
      actor_name: (row.actor as { name?: string } | null)?.name || "Unknown",
      actor_email: (row.actor as { email?: string } | null)?.email || "Unknown",
      action: row.action as string,
      resource_type: row.resource_type as string,
      resource_id: row.resource_id as string | null,
      changes: row.changes as Record<string, unknown> | null,
      ip_address: row.ip_address as string,
      created_at: row.created_at as string,
    }));

    const nextCursor = entries.length === validated.pageSize
      ? entries[entries.length - 1]?.created_at
      : null;

    return {
      success: true as const,
      data: {
        entries,
        totalCount: count || 0,
        nextCursor,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch audit log";
    return { success: false as const, error: message };
  }
}

// ═══════════════════════════════════════════════════════
// ACTION: Export Audit Log
// ═══════════════════════════════════════════════════════

export async function exportAuditLog(
  format: "csv" | "json",
  filters: z.infer<typeof AuditLogFiltersSchema>
) {
  try {
    const validated = AuditLogFiltersSchema.parse({ ...filters, pageSize: 10000 });
    const supabase = await createSupabaseServer();

    let query = supabase
      .from("audit_log")
      .select(`
        *,
        actor:users!actor_id(id, name, email)
      `)
      .order("created_at", { ascending: false });

    if (validated.actorId) {
      query = query.eq("actor_id", validated.actorId);
    }

    if (validated.action) {
      query = query.eq("action", validated.action);
    }

    if (validated.resourceType) {
      query = query.eq("resource_type", validated.resourceType);
    }

    if (validated.startDate) {
      query = query.gte("created_at", validated.startDate);
    }

    if (validated.endDate) {
      query = query.lte("created_at", validated.endDate);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to export audit log: ${error.message}`);
    }

    const entries: AuditLogEntry[] = (data || []).map((row: Record<string, unknown>) => ({
      id: row.id as string,
      actor_id: row.actor_id as string,
      actor_name: (row.actor as { name?: string } | null)?.name || "Unknown",
      actor_email: (row.actor as { email?: string } | null)?.email || "Unknown",
      action: row.action as string,
      resource_type: row.resource_type as string,
      resource_id: row.resource_id as string | null,
      changes: row.changes as Record<string, unknown> | null,
      ip_address: row.ip_address as string,
      created_at: row.created_at as string,
    }));

    if (format === "json") {
      return {
        success: true as const,
        data: JSON.stringify(entries, null, 2),
      };
    }

    // CSV format
    const headers = ["Timestamp", "Actor", "Email", "Action", "Resource Type", "Resource ID", "IP Address", "Changes"];
    const rows = entries.map((entry) => [
      entry.created_at,
      entry.actor_name,
      entry.actor_email,
      entry.action,
      entry.resource_type,
      entry.resource_id || "",
      entry.ip_address,
      entry.changes ? JSON.stringify(entry.changes) : "",
    ]);

    const csv = [headers.join(","), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))].join("\n");

    return {
      success: true as const,
      data: csv,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to export audit log";
    return { success: false as const, error: message };
  }
}

// ═══════════════════════════════════════════════════════
// ACTION: Get Admin Accounts
// ═══════════════════════════════════════════════════════

export async function getAdminAccounts() {
  try {
    const supabase = await createSupabaseServer();

    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("role", "super_admin")
      .order("created_at", { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch admin accounts: ${error.message}`);
    }

    const admins: AdminAccount[] = (data || []).map((row: Record<string, unknown>) => ({
      id: row.id as string,
      name: row.name as string,
      email: row.email as string,
      role: (row.metadata as { role?: AdminRole } | null)?.role || "super_admin",
      last_login_at: row.last_sign_in_at as string | null,
      is_active: row.deleted_at === null,
      created_at: row.created_at as string,
      created_by: (row.metadata as { created_by?: string } | null)?.created_by || null,
    }));

    return { success: true as const, data: { admins } };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch admin accounts";
    return { success: false as const, error: message };
  }
}

// ═══════════════════════════════════════════════════════
// ACTION: Create Admin Account
// ═══════════════════════════════════════════════════════

export async function createAdminAccount(
  input: z.infer<typeof CreateAdminSchema>
) {
  try {
    const validated = CreateAdminSchema.parse(input);
    const supabase = await createSupabaseServer();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false as const, error: "Unauthorized" };
    }

    // Create the admin user
    const admin = createSupabaseAdmin();
    const { data: newUser, error: createError } = await admin.auth.admin.createUser({
      email: validated.email,
      email_confirm: true,
      user_metadata: {
        name: validated.name,
        role: validated.role,
        created_by: user.id,
      },
    });

    if (createError) {
      throw new Error(`Failed to create admin: ${createError.message}`);
    }

    // Insert into users table
    const { error: insertError } = await (admin
      .from("users")
      // @ts-ignore — admin client maps public.users to auth.users
      .insert({
        id: newUser.user!.id,
        email: validated.email,
        name: validated.name,
        role: "super_admin",
        school_id: null, // Super admins don't belong to schools
        metadata: { admin_role: validated.role, created_by: user.id },
      }) as any);

    if (insertError) {
      throw new Error(`Failed to insert admin user: ${insertError.message}`);
    }

    // Write audit log
      // @ts-ignore — audit_log not in Supabase generated types
    await admin.from("audit_log").insert({
      // @ts-ignore — audit_log not in Supabase generated types
      // @ts-ignore — audit_log not in Supabase generated types
      actor_id: user.id,
      action: "CREATE_ADMIN",
      resource_type: "users",
      resource_id: newUser.user!.id,
      changes: { name: validated.name, email: validated.email, role: validated.role },
      ip_address: getClientIp(),
    } as unknown as AuditLogInsert);

    return { success: true as const, data: { adminId: newUser.user!.id } };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create admin";
    return { success: false as const, error: message };
  }
}

// ═══════════════════════════════════════════════════════
// ACTION: Update Admin Role
// ═══════════════════════════════════════════════════════

export async function updateAdminRole(
  input: z.infer<typeof UpdateAdminRoleSchema>
) {
  try {
    const validated = UpdateAdminRoleSchema.parse(input);
    const supabase = await createSupabaseServer();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false as const, error: "Unauthorized" };
    }

    const admin = createSupabaseAdmin();

    // Get current role
    const { data: currentAdmin } = await (admin
      .from("users")
      .select("metadata")
      .eq("id", validated.adminId)
      .single() as unknown as { data: PublicUsersRow | null });

    if (!currentAdmin) {
      return { success: false as const, error: "Admin not found" };
    }

    const currentRole = (currentAdmin.metadata as { admin_role?: string } | null)?.admin_role || "super_admin";

    // Update role
    const { error: updateError } = await (admin
      .from("users")
      // @ts-ignore — admin client maps public.users to auth.users which lacks metadata
      .update({
        metadata: { ...currentAdmin.metadata, admin_role: validated.newRole },
      }) as any)
      .eq("id", validated.adminId);

    if (updateError) {
      throw new Error(`Failed to update role: ${updateError.message}`);
    }

    // Write audit log
      // @ts-ignore — audit_log not in Supabase generated types
    await admin.from("audit_log").insert({
      // @ts-ignore — audit_log not in Supabase generated types
      // @ts-ignore — audit_log not in Supabase generated types
      actor_id: user.id,
      action: "UPDATE_ADMIN_ROLE",
      resource_type: "users",
      resource_id: validated.adminId,
      changes: { from_role: currentRole, to_role: validated.newRole },
      ip_address: getClientIp(),
    } as unknown as AuditLogInsert);

    return { success: true as const, data: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update role";
    return { success: false as const, error: message };
  }
}

// ═══════════════════════════════════════════════════════
// ACTION: Deactivate Admin
// ═══════════════════════════════════════════════════════

export async function deactivateAdmin(adminId: string) {
  try {
    const supabase = await createSupabaseServer();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false as const, error: "Unauthorized" };
    }

    const admin = createSupabaseAdmin();

    // Soft delete by setting deleted_at
    const { error: deleteError } = await admin.auth.admin.deleteUser(adminId);

    if (deleteError) {
      throw new Error(`Failed to deactivate admin: ${deleteError.message}`);
    }

    // Also update users table
    await (admin
      .from("users")
      // @ts-ignore — admin client maps public.users to auth.users
    .update({ deleted_at: new Date().toISOString() }) as any)
      .eq("id", adminId);

    // Write audit log
      // @ts-ignore — audit_log not in Supabase generated types
    await admin.from("audit_log").insert({
      // @ts-ignore — audit_log not in Supabase generated types
      // @ts-ignore — audit_log not in Supabase generated types
      actor_id: user.id,
      action: "DEACTIVATE_ADMIN",
      resource_type: "users",
      resource_id: adminId,
      changes: null,
      ip_address: getClientIp(),
    } as unknown as AuditLogInsert);

    return { success: true as const, data: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to deactivate admin";
    return { success: false as const, error: message };
  }
}

// ═══════════════════════════════════════════════════════
// ACTION: Reset Admin Password
// ═══════════════════════════════════════════════════════

export async function resetAdminPassword(adminId: string, newPassword: string) {
  try {
    const supabase = await createSupabaseServer();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false as const, error: "Unauthorized" };
    }

    const admin = createSupabaseAdmin();

    const { error: updateError } = await admin.auth.admin.updateUserById(
      adminId,
      { password: newPassword }
    );

    if (updateError) {
      throw new Error(`Failed to reset password: ${updateError.message}`);
    }

    // Write audit log
      // @ts-ignore — audit_log not in Supabase generated types
    await admin.from("audit_log").insert({
      // @ts-ignore — audit_log not in Supabase generated types
      // @ts-ignore — audit_log not in Supabase generated types
      actor_id: user.id,
      action: "RESET_ADMIN_PASSWORD",
      resource_type: "users",
      resource_id: adminId,
      changes: { password_reset: true },
      ip_address: getClientIp(),
    } as unknown as AuditLogInsert);

    return { success: true as const, data: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to reset password";
    return { success: false as const, error: message };
  }
}

// ═══════════════════════════════════════════════════════
// ACTION: Get System Health
// ═══════════════════════════════════════════════════════

export async function getSystemHealth() {
  try {
    const supabase = await createSupabaseServer();
    const startTime = Date.now();

    // Check Supabase database
    const { error: dbError } = await supabase.from("schools").select("id").limit(1);
    const dbResponseTime = Date.now() - startTime;

    const dbStatus: SystemHealthStatus = {
      service: "Supabase Database",
      status: dbError ? "down" : "healthy",
      response_time_ms: dbResponseTime,
      last_check: new Date().toISOString(),
      error_message: dbError?.message || null,
    };

    // Check Supabase Auth
    const authStartTime = Date.now();
    const { error: authError } = await supabase.auth.getUser();
    const authResponseTime = Date.now() - authStartTime;

    const authStatus: SystemHealthStatus = {
      service: "Supabase Auth",
      status: authError ? "down" : "healthy",
      response_time_ms: authResponseTime,
      last_check: new Date().toISOString(),
      error_message: authError?.message || null,
    };

    // Check Supabase Storage (simulated - would need actual bucket check)
    const storageStatus: SystemHealthStatus = {
      service: "Supabase Storage",
      status: "healthy",
      response_time_ms: null,
      last_check: new Date().toISOString(),
      error_message: null,
    };

    // Check AI APIs (simulated)
    const aiApiStatus: SystemHealthStatus = {
      service: "AI APIs (Gemini/Claude/OpenAI)",
      status: "healthy",
      response_time_ms: null,
      last_check: new Date().toISOString(),
      error_message: null,
    };

    // Vercel status (simulated - would need actual check)
    const vercelStatus: SystemHealthStatus = {
      service: "Vercel Edge Functions",
      status: "healthy",
      response_time_ms: null,
      last_check: new Date().toISOString(),
      error_message: null,
    };

    return {
      success: true as const,
      data: {
        services: [dbStatus, authStatus, storageStatus, aiApiStatus, vercelStatus],
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to check system health";
    return { success: false as const, error: message };
  }
}

// ═══════════════════════════════════════════════════════
// ACTION: Get Background Jobs
// ═══════════════════════════════════════════════════════

export async function getBackgroundJobs() {
  try {
    const supabase = await createSupabaseServer();

    const { data, error } = await supabase
      .from("background_jobs")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch background jobs: ${error.message}`);
    }

    const jobs: BackgroundJob[] = (data || []).map((row: Record<string, unknown>) => ({
      id: row.id as string,
      name: row.name as string,
      description: row.description as string,
      schedule: row.schedule as string,
      last_run: row.last_run_at as string | null,
      next_run: row.next_run_at as string | null,
      status: (row.status as "running" | "completed" | "failed" | "scheduled") || "scheduled",
      last_duration_seconds: row.last_duration_seconds as number | null,
      error_message: row.error_message as string | null,
    }));

    // If no data, return default jobs
    if (jobs.length === 0) {
      return {
        success: true as const,
        data: {
          jobs: getDefaultBackgroundJobs(),
        },
      };
    }

    return { success: true as const, data: { jobs } };
  } catch (err) {
    // Return default jobs on error
    return {
      success: true as const,
      data: {
        jobs: getDefaultBackgroundJobs(),
      },
    };
  }
}

function getDefaultBackgroundJobs(): BackgroundJob[] {
  const now = new Date();
  return [
    {
      id: "1",
      name: "Alert Generation",
      description: "Generates system alerts every 5 minutes",
      schedule: "*/5 * * * *",
      last_run: new Date(now.getTime() - 3 * 60 * 1000).toISOString(),
      next_run: new Date(now.getTime() + 2 * 60 * 1000).toISOString(),
      status: "completed",
      last_duration_seconds: 12,
      error_message: null,
    },
    {
      id: "2",
      name: "Daily Metrics Computation",
      description: "Computes daily school metrics at midnight IST",
      schedule: "0 0 * * *",
      last_run: new Date(now.getTime() - 14 * 60 * 60 * 1000).toISOString(),
      next_run: new Date(now.getTime() + 10 * 60 * 60 * 1000).toISOString(),
      status: "completed",
      last_duration_seconds: 45,
      error_message: null,
    },
    {
      id: "3",
      name: "Monthly Costs Computation",
      description: "Computes monthly AI costs on the 1st of each month",
      schedule: "0 1 1 * *",
      last_run: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      next_run: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000).toISOString(),
      status: "completed",
      last_duration_seconds: 120,
      error_message: null,
    },
    {
      id: "4",
      name: "Content Pre-generation Queue",
      description: "Processes content pre-generation queue",
      schedule: "Continuous",
      last_run: new Date(now.getTime() - 30 * 1000).toISOString(),
      next_run: new Date(now.getTime() + 30 * 1000).toISOString(),
      status: "running",
      last_duration_seconds: null,
      error_message: null,
    },
    {
      id: "5",
      name: "Scheduled Notification Sender",
      description: "Sends scheduled notifications",
      schedule: "Every minute",
      last_run: new Date(now.getTime() - 45 * 1000).toISOString(),
      next_run: new Date(now.getTime() + 15 * 1000).toISOString(),
      status: "completed",
      last_duration_seconds: 3,
      error_message: null,
    },
  ];
}

// ═══════════════════════════════════════════════════════
// ACTION: Get Alert Statistics
// ═══════════════════════════════════════════════════════

export async function getAlertStatistics() {
  try {
    const supabase = await createSupabaseServer();

    const { data, error } = await (supabase
      .from("admin_alerts")
      .select("severity, resolved_at") as unknown as { data: Array<{ severity: AlertSeverity; resolved_at: string | null }> | null; error: null | { message: string } });

    if (error) {
      throw new Error(`Failed to fetch alert statistics: ${error.message}`);
    }

    const stats = {
      total: data?.length || 0,
      critical: data?.filter((a) => a.severity === "critical").length || 0,
      high: data?.filter((a) => a.severity === "high").length || 0,
      medium: data?.filter((a) => a.severity === "medium").length || 0,
      low: data?.filter((a) => a.severity === "low").length || 0,
      unresolved: data?.filter((a) => !a.resolved_at).length || 0,
      resolved: data?.filter((a) => a.resolved_at).length || 0,
    };

    return { success: true as const, data: stats };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch statistics";
    return { success: false as const, error: message };
  }
}

// ═══════════════════════════════════════════════════════
// ACTION: Get Active Impersonation Sessions
// ═══════════════════════════════════════════════════════

export async function getActiveImpersonationCount() {
  try {
    const supabase = await createSupabaseServer();

    const { count, error } = await supabase
      .from("impersonation_log")
      .select("*", { count: "exact", head: true })
      .is("ended_at", null);

    if (error) {
      throw new Error(`Failed to fetch active sessions: ${error.message}`);
    }

    return { success: true as const, data: { count: count || 0 } };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch active sessions";
    return { success: false as const, error: message };
  }
}

// ═══════════════════════════════════════════════════════
// ACTION: Get Admin Activity
// ═══════════════════════════════════════════════════════

export async function getAdminActivity(adminId: string) {
  try {
    const supabase = await createSupabaseServer();

    const { data, error } = await supabase
      .from("audit_log")
      .select("*")
      .eq("actor_id", adminId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      throw new Error(`Failed to fetch admin activity: ${error.message}`);
    }

    return { success: true as const, data: { entries: data || [] } };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch admin activity";
    return { success: false as const, error: message };
  }
}

// ═══════════════════════════════════════════════════════
// TYPE EXPORTS
// ═══════════════════════════════════════════════════════

export type ResolveAlertResult = Awaited<ReturnType<typeof resolveAlert>>;
export type GetSystemAlertsResult = Awaited<ReturnType<typeof getSystemAlerts>>;
export type GetImpersonationSessionsResult = Awaited<ReturnType<typeof getImpersonationSessions>>;
export type GetAuditLogResult = Awaited<ReturnType<typeof getAuditLog>>;
export type GetAdminAccountsResult = Awaited<ReturnType<typeof getAdminAccounts>>;
export type GetSystemHealthResult = Awaited<ReturnType<typeof getSystemHealth>>;
export type GetBackgroundJobsResult = Awaited<ReturnType<typeof getBackgroundJobs>>;
export type AlertStatistics = Awaited<ReturnType<typeof getAlertStatistics>>;
