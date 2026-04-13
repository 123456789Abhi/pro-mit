"use server";

import { createSupabaseServer } from "@/lib/supabase/server";
import {
  NotificationStatus,
  NotificationPriority,
  NotificationCategory,
  TargetRole,
  composeNotificationSchema,
  templateSchema,
} from "@/lib/notifications/types";
import { z } from "zod";
import { classifyFeedback } from "@/lib/utils/feedback";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface NotificationRow {
  id: string;
  title: string;
  body: string;
  priority: NotificationPriority;
  category: NotificationCategory | null;
  target_role: TargetRole;
  target_schools: string[];
  status: NotificationStatus;
  scheduled_at: string | null;
  sent_at: string | null;
  delivered_count: number;
  read_count: number;
  failed_count: number;
  has_rating: boolean;
  is_pinned: boolean;
  version: number;
  created_at: string;
  schools?: { name: string }[];
}

export interface TemplateRow {
  id: string;
  title: string;
  body: string;
  priority: NotificationPriority;
  category: NotificationCategory | null;
  has_rating: boolean;
  use_count: number;
  created_at: string;
  updated_at: string;
}

export interface FeedbackRow {
  id: string;
  notification_id: string;
  sender_id: string;
  school_id: string;
  feedback_text: string;
  is_anonymous: boolean;
  rating: number | null;
  created_at: string;
  sender_name?: string;
  school_name?: string;
  notification_title?: string;
  tags?: string[];
}

export interface AnalyticsSummary {
  totalSent: number;
  totalDelivered: number;
  totalRead: number;
  avgReadRate: number;
  avgRating: number;
  totalRatings: number;
  failureRate: number;
}

export interface NotificationFilters {
  status?: NotificationStatus | "all";
  targetRole?: TargetRole | "all";
  category?: NotificationCategory | "all";
  priority?: NotificationPriority | "all";
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATION ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch notifications sent by Super Admin with filters and pagination.
 */
export async function getSuperAdminNotifications(
  filters: NotificationFilters,
  page: number = 1,
  pageSize: number = 20
): Promise<PaginatedResult<NotificationRow>> {
  const supabase = await createSupabaseServer() as any;

  let query = supabase
  .from("notifications")
    .select(`
      id,
      title,
      body,
      priority,
      category,
      target_role,
      target_schools,
      status,
      scheduled_at,
      sent_at,
      delivered_count,
      read_count,
      failed_count,
      has_rating,
      is_pinned,
      version,
      created_at
    `)
    .eq("sender_role", "super_admin")
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }
  if (filters.targetRole && filters.targetRole !== "all") {
    query = query.eq("target_role", filters.targetRole);
  }
  if (filters.category && filters.category !== "all") {
    query = query.eq("category", filters.category);
  }
  if (filters.priority && filters.priority !== "all") {
    query = query.eq("priority", filters.priority);
  }
  if (filters.dateFrom) {
    query = query.gte("created_at", filters.dateFrom);
  }
  if (filters.dateTo) {
    query = query.lte("created_at", filters.dateTo + "T23:59:59.999Z");
  }
  if (filters.search) {
    query = query.or(`title.ilike.%${filters.search}%,body.ilike.%${filters.search}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch notifications: ${error.message}`);
  }

  const total = count ?? data?.length ?? 0;

  return {
    data: (data ?? []) as NotificationRow[],
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * Get a single notification by ID with school details.
 */
export async function getNotificationById(id: string): Promise<NotificationRow | null> {
  const supabase = await createSupabaseServer() as any;

  const { data, error } = await supabase
  .from("notifications")
    .select(`
      id,
      title,
      body,
      priority,
      category,
      target_role,
      target_schools,
      status,
      scheduled_at,
      sent_at,
      delivered_count,
      read_count,
      failed_count,
      has_rating,
      is_pinned,
      version,
      created_at,
      attachments,
      links
    `)
    .eq("id", id)
    .eq("sender_role", "super_admin")
    .single();

  if (error) {return null;}
  return data as NotificationRow;
}

/**
 * Get recipient breakdown for a notification.
 */
export async function getNotificationRecipients(
  notificationId: string
): Promise<{ recipient_id: string; status: string; rating: number | null }[]> {
  const supabase = await createSupabaseServer() as any;

  const { data: notificationData } = await supabase
  .from("notifications")
    .select("id")
    .eq("id", notificationId)
    .eq("sender_role", "super_admin")
    .single();

  if (notificationData === null) {return [];}

  const { data, error } = await supabase
  .from("notification_recipients")
    .select("recipient_id, status, rating")
    .eq("notification_id", notificationId);

  if (error) {throw new Error(`Failed to fetch recipients: ${error.message}`);}
  return (data ?? []) as { recipient_id: string; status: string; rating: number | null }[];
}

/**
 * Send or schedule a new notification (Super Admin).
 */
export async function sendSuperAdminNotification(
  rawInput: Record<string, unknown>
): Promise<{ success: true; notificationId: string; recipientCount: number } | { success: false; error: string }> {
  try {
    const supabase = await createSupabaseServer() as any;

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Get user record to verify super_admin role
    const { data: userData, error: userError } = await supabase
    .from("users")
      .select("id, role")
      .eq("id", user.id)
      .single();

    if (userError || !userData || userData.role !== "super_admin") {
      return { success: false, error: "Only Super Admin can send notifications" };
    }

    // Validate input
    const input = composeNotificationSchema.parse(rawInput);

    const status = input.sendNow
      ? NotificationStatus.SENDING
      : NotificationStatus.SCHEDULED;

    // Insert notification
    const { data: notifData, error: notifError } = await supabase
    .from("notifications")
      .insert({
        sender_id: user.id,
        sender_role: "super_admin",
        school_id: null,
        type: input.hasRating ? "rating_request" : "standard",
        title: input.title.trim(),
        body: input.body.trim(),
        priority: input.priority,
        category: input.category ?? null,
        attachments: input.attachments ?? [],
        links: input.links ?? [],
        is_pinned: input.isPinned ?? false,
        has_rating: input.hasRating ?? false,
        template_id: input.templateId ?? null,
        target_role: input.targetRole,
        target_schools: input.targetSchools,
        target_departments: input.targetDepartments ?? null,
        target_grades: input.targetGrades ?? null,
        target_streams: input.targetStreams ?? null,
        status,
        scheduled_at: input.scheduledAt ?? null,
      })
      .select("id")
      .single();

    if (notifError) {
      return { success: false, error: `Failed to create notification: ${notifError.message}` };
    }

    const notificationId = (notifData as { id: string }).id;

    // Resolve recipients and insert recipient rows
    let recipientCount = 0;
    if (input.sendNow) {
      const resolved = await resolveRecipients(supabase, input.targetRole, input.targetSchools);
      recipientCount = resolved.length;

      if (resolved.length > 0) {
        const recipientRows = resolved.map((r) => ({
          notification_id: notificationId,
          recipient_id: r.id,
          school_id: r.school_id,
          status: "pending" as const,
        }));

        await supabase.from("notification_recipients").insert(recipientRows);

        // Update delivered count
        await supabase
        .from("notifications")
          .update({
            delivered_count: resolved.length,
            status: NotificationStatus.SENT,
            sent_at: new Date().toISOString(),
          })
          .eq("id", notificationId);
      } else {
        await supabase
        .from("notifications")
          .update({ status: NotificationStatus.PARTIALLY_FAILED })
          .eq("id", notificationId);
      }
    }

    return { success: true, notificationId, recipientCount };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { success: false, error: err.errors.map((e) => e.message).join(", ") };
    }
    const msg = err instanceof Error ? err.message : "An unexpected error occurred";
    return { success: false, error: msg };
  }
}

/**
 * Preview recipients before sending.
 */
export async function previewRecipientsAction(
  targetRole: TargetRole,
  targetSchools: string[]
): Promise<{ totalSchools: number; totalRecipients: number; bySchool: { name: string; count: number }[] }> {
  const supabase = await createSupabaseServer() as any;

  const roleMap: Record<TargetRole, string> = {
    [TargetRole.PRINCIPAL]: "principal",
    [TargetRole.TEACHER]: "teacher",
    [TargetRole.STUDENT]: "student",
  };

  // Count recipients per school
  const { data, error } = await supabase
  .from("users")
    .select("id, school_id, schools(name)")
    .eq("role", roleMap[targetRole])
    .in("school_id", targetSchools)
    .is("deleted_at", null);

  if (error) {
    throw new Error(`Failed to preview recipients: ${error.message}`);
  }

  const users = (data ?? []) as any[];
  const bySchool: Record<string, { name: string; count: number }> = {};

  for (const user of users) {
    const schoolId = user.school_id as string;
    const schoolName = (user.schools as { name: string } | null)?.name ?? schoolId;
    if (!bySchool[schoolId]) {
      bySchool[schoolId] = { name: schoolName, count: 0 };
    }
    bySchool[schoolId].count++;
  }

  return {
    totalSchools: Object.keys(bySchool).length,
    totalRecipients: users.length,
    bySchool: Object.values(bySchool),
  };
}

/**
 * Transition a scheduled notification status.
 */
export async function transitionNotificationStatus(
  notificationId: string,
  expectedVersion: number,
  action: "pause" | "resume" | "cancel" | "send"
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const supabase = await createSupabaseServer() as any;

    const { data: user } = await supabase.auth.getUser();
    if (!user) {return { success: false, error: "Not authenticated" };}

    // Get current notification
    const { data: notif, error: fetchError } = await supabase
    .from("notifications")
      .select("id, status, version, scheduled_at")
      .eq("id", notificationId)
      .eq("sender_role", "super_admin")
      .single();

    if (fetchError || !notif) {
      return { success: false, error: "Notification not found" };
    }

    if (notif.version !== expectedVersion) {
      return { success: false, error: "Notification was modified by another session. Please refresh and try again." };
    }

    const transitions: Record<string, { to: NotificationStatus; validate?: (n: NotificationRow) => boolean }> = {
      pause: { to: NotificationStatus.PAUSED, validate: (n) => n.status === NotificationStatus.SCHEDULED },
      resume: { to: NotificationStatus.SCHEDULED, validate: (n) => n.status === NotificationStatus.PAUSED },
      cancel: { to: NotificationStatus.CANCELLED, validate: (n) => (NotificationStatus.SCHEDULED === n.status || NotificationStatus.PAUSED === n.status) },
      send: { to: NotificationStatus.SENDING, validate: (n) => (NotificationStatus.SCHEDULED === n.status || NotificationStatus.PAUSED === n.status) },
    };

    const t = transitions[action];
    if (!t) {return { success: false, error: "Invalid action" };}
    if (t.validate && !t.validate(notif as NotificationRow)) {
      return { success: false, error: `Cannot ${action} notification in current state` };
    }

    const updateData: Record<string, unknown> = {
      status: t.to,
      version: notif.version + 1,
    };

    if (action === "cancel") {
      updateData.cancelled_at = new Date().toISOString();
    }
    if (action === "send") {
      updateData.sent_at = new Date().toISOString();
    }

    const { error: updateError } = await supabase
    .from("notifications")
      .update(updateData)
      .eq("id", notificationId)
      .eq("version", expectedVersion);

    if (updateError) {
      if (updateError.message.includes("version")) {
        return { success: false, error: "Notification was modified. Please refresh." };
      }
      return { success: false, error: `Update failed: ${updateError.message}` };
    }

    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "An unexpected error occurred";
    return { success: false, error: msg };
  }
}

/**
 * Retry a failed notification.
 */
export async function retryFailedNotification(
  notificationId: string
): Promise<{ success: true; retriedCount: number } | { success: false; error: string }> {
  try {
    const supabase = await createSupabaseServer() as any;

    const { data: user } = await supabase.auth.getUser();
    if (!user) {return { success: false, error: "Not authenticated" };}

    // Get failed recipients
    const { data: failedRecipients, error: recError } = await supabase
    .from("notification_recipients")
      .select("id")
      .eq("notification_id", notificationId)
      .eq("status", "failed");

    if (recError) {return { success: false, error: `Failed to fetch recipients: ${recError.message}` };}

    const retriedCount = failedRecipients?.length ?? 0;

    // Reset failed recipients to pending
    if (retriedCount > 0) {
      await supabase
      .from("notification_recipients")
        .update({ status: "pending", failure_reason: null })
        .eq("notification_id", notificationId)
        .eq("status", "failed");

      // Update notification status
      const { data: notif } = await supabase
      .from("notifications")
        .select("id, version")
        .eq("id", notificationId)
        .single();
      await supabase
      .from("notifications")
        .update({ status: NotificationStatus.SENDING, version: (notif?.version ?? 0) + 1 })
        .eq("id", notificationId);
    }

    return { success: true, retriedCount };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "An unexpected error occurred";
    return { success: false, error: msg };
  }
}

/**
 * Edit a scheduled notification.
 */
export async function editScheduledNotificationAction(
  notificationId: string,
  rawInput: Record<string, unknown>,
  expectedVersion: number
): Promise<{ success: true; newVersion: number } | { success: false; error: string }> {
  try {
    const supabase = await createSupabaseServer() as any;

    const { data: user } = await supabase.auth.getUser();
    if (!user) {return { success: false, error: "Not authenticated" };}

    const input = composeNotificationSchema.parse(rawInput);

    // Check version
    const { data: notif, error: fetchError } = await supabase
    .from("notifications")
      .select("id, version, status")
      .eq("id", notificationId)
      .eq("sender_role", "super_admin")
      .single();

    if (fetchError || !notif) {return { success: false, error: "Notification not found" };}
    if (notif.version !== expectedVersion) {return { success: false, error: "Notification was modified. Please refresh." };}
    if (notif.status !== NotificationStatus.SCHEDULED && notif.status !== NotificationStatus.PAUSED) {
      return { success: false, error: "Can only edit scheduled or paused notifications" };
    }

    const { error: updateError } = await supabase
    .from("notifications")
      .update({
        title: input.title.trim(),
        body: input.body.trim(),
        priority: input.priority,
        category: input.category ?? null,
        attachments: input.attachments ?? [],
        links: input.links ?? [],
        is_pinned: input.isPinned ?? false,
        scheduled_at: input.scheduledAt ?? null,
        target_role: input.targetRole,
        target_schools: input.targetSchools,
        target_departments: input.targetDepartments ?? null,
        target_grades: input.targetGrades ?? null,
        target_streams: input.targetStreams ?? null,
        version: notif.version + 1,
      })
      .eq("id", notificationId)
      .eq("version", expectedVersion);

    if (updateError) {
      if (updateError.message.includes("version")) {return { success: false, error: "Notification was modified. Please refresh." };}
      return { success: false, error: `Update failed: ${updateError.message}` };
    }

    return { success: true, newVersion: notif.version + 1 };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { success: false, error: err.errors.map((e) => e.message).join(", ") };
    }
    const msg = err instanceof Error ? err.message : "An unexpected error occurred";
    return { success: false, error: msg };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Resolve recipients
// ─────────────────────────────────────────────────────────────────────────────

async function resolveRecipients(
  supabase: Awaited<ReturnType<typeof createSupabaseServer>>,
  targetRole: TargetRole,
  targetSchools: string[]
): Promise<{ id: string; school_id: string }[]> {
  const roleMap: Record<TargetRole, string> = {
    [TargetRole.PRINCIPAL]: "principal",
    [TargetRole.TEACHER]: "teacher",
    [TargetRole.STUDENT]: "student",
  };

  const { data, error } = await supabase
  .from("users")
    .select("id, school_id")
    .eq("role", roleMap[targetRole])
    .in("school_id", targetSchools)
    .is("deleted_at", null);

  if (error) {return [];}
  return ((data ?? []) as { id: string; school_id: string }[]).map((u) => ({ id: u.id, school_id: u.school_id }));
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch notification templates.
 */
export async function getTemplates(): Promise<TemplateRow[]> {
  const supabase = await createSupabaseServer() as any;

  const { data, error } = await supabase
  .from("notification_templates")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {throw new Error(`Failed to fetch templates: ${error.message}`);}
  return (data ?? []) as TemplateRow[];
}

/**
 * Create a new notification template.
 */
export async function createTemplate(
  rawInput: Record<string, unknown>
): Promise<{ success: true; id: string } | { success: false; error: string }> {
  try {
    const supabase = await createSupabaseServer() as any;

    const { data: user } = await supabase.auth.getUser();
    if (!user) {return { success: false, error: "Not authenticated" };}

    const input = templateSchema.parse(rawInput);

    const { data: result, error } = await supabase
    .from("notification_templates")
      .insert({
        title: input.title,
        body: input.body,
        priority: input.priority,
        category: input.category ?? null,
        has_rating: input.hasRating,
        use_count: 0,
      })
      .select("id")
      .single();

    if (error) {return { success: false, error: `Failed to create template: ${error.message}` };}

    return { success: true, id: (result as { id: string }).id };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { success: false, error: err.errors.map((e) => e.message).join(", ") };
    }
    const msg = err instanceof Error ? err.message : "An unexpected error occurred";
    return { success: false, error: msg };
  }
}

/**
 * Update an existing template.
 */
export async function updateTemplate(
  templateId: string,
  rawInput: Record<string, unknown>
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const supabase = await createSupabaseServer() as any;

    const { data: user } = await supabase.auth.getUser();
    if (!user) {return { success: false, error: "Not authenticated" };}

    const input = templateSchema.parse(rawInput);

    const { error } = await supabase
    .from("notification_templates")
      .update({
        title: input.title,
        body: input.body,
        priority: input.priority,
        category: input.category ?? null,
        has_rating: input.hasRating,
        updated_at: new Date().toISOString(),
      })
      .eq("id", templateId);

    if (error) {return { success: false, error: `Failed to update template: ${error.message}` };}

    return { success: true };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { success: false, error: err.errors.map((e) => e.message).join(", ") };
    }
    const msg = err instanceof Error ? err.message : "An unexpected error occurred";
    return { success: false, error: msg };
  }
}

/**
 * Delete a template.
 */
export async function deleteTemplate(
  templateId: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const supabase = await createSupabaseServer() as any;

    const { data: user } = await supabase.auth.getUser();
    if (!user) {return { success: false, error: "Not authenticated" };}

    const { error } = await supabase
    .from("notification_templates")
      .delete()
      .eq("id", templateId);

    if (error) {return { success: false, error: `Failed to delete template: ${error.message}` };}

    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "An unexpected error occurred";
    return { success: false, error: msg };
  }
}

/**
 * Increment template use count.
 */
export async function incrementTemplateUseCount(
  templateId: string
): Promise<void> {
  const supabase = await createSupabaseServer() as any;

  await supabase.rpc("increment_template_use_count", { p_template_id: templateId });
}

// ─────────────────────────────────────────────────────────────────────────────
// FEEDBACK ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch feedback for notifications sent by Super Admin.
 */
export async function getSuperAdminFeedback(
  page: number = 1,
  pageSize: number = 20
): Promise<PaginatedResult<FeedbackRow>> {
  const supabase = await createSupabaseServer() as any;

  const { data, error, count } = await supabase
  .from("notification_feedback")
    .select(`
      id,
      notification_id,
      sender_id,
      school_id,
      feedback_text,
      is_anonymous,
      rating,
      created_at,
      notifications(title)
    `, { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (error) {throw new Error(`Failed to fetch feedback: ${error.message}`);}

  const rows = (data ?? []) as any[];
  const total = count ?? rows.length;

  // Fetch school names for non-anonymous feedback
  const enriched = await Promise.all(
    (rows as any[]).map(async (row: any) => {
      let schoolName: string | undefined;
      if (!row.is_anonymous) {
        const { data: schoolData } = await supabase
        .from("schools")
          .select("name")
          .eq("id", row.school_id)
          .single();
        schoolName = (schoolData as { name: string } | null)?.name;
      }
      return {
        ...row,
        notification_title: (row.notifications as { title: string } | null)?.title,
        school_name: schoolName,
      } as FeedbackRow;
    })
  );

  return {
    data: enriched,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * Auto-classify feedback into tags.
 */

// ─────────────────────────────────────────────────────────────────────────────
// ANALYTICS ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get analytics summary for Super Admin notifications.
 */
export async function getAnalyticsSummary(
  dateFrom?: string,
  dateTo?: string
): Promise<AnalyticsSummary> {
  const supabase = await createSupabaseServer() as any;

  let query = supabase
  .from("notifications")
    .select("delivered_count, read_count, failed_count")
    .eq("sender_role", "super_admin")
    .neq("status", "draft")
    .neq("status", "cancelled");

  if (dateFrom) {query = query.gte("created_at", dateFrom);}
  if (dateTo) {query = query.lte("created_at", dateTo + "T23:59:59.999Z");}

  const { data, error } = await query;

  if (error) {throw new Error(`Failed to fetch analytics: ${error.message}`);}

  const notifications = (data ?? []) as any[];
  const totalSent = notifications.length;
  const totalDelivered = notifications.reduce((sum, n) => sum + (n.delivered_count ?? 0), 0);
  const totalRead = notifications.reduce((sum, n) => sum + (n.read_count ?? 0), 0);
  const totalFailed = notifications.reduce((sum, n) => sum + (n.failed_count ?? 0), 0);
  const avgReadRate = totalDelivered > 0 ? (totalRead / totalDelivered) * 100 : 0;
  const failureRate = totalSent > 0 ? (totalFailed / totalSent) * 100 : 0;

  // Get average rating
  const { data: ratingsData } = await supabase
  .from("notification_recipients")
    .select("rating")
    .not("rating", "is", null)
    .gte("rated_at", dateFrom ?? "1970-01-01")
    .lte("rated_at", dateTo ? dateTo + "T23:59:59.999Z" : new Date().toISOString());

  const ratings = (ratingsData ?? []) as any[];
  const avgRating = ratings.length > 0 ? ratings.map((r: any) => r.rating as number).reduce((a: number, b: number) => a + b, 0) / ratings.length : 0;

  return {
    totalSent,
    totalDelivered,
    totalRead,
    avgReadRate: Math.round(avgReadRate * 10) / 10,
    avgRating: Math.round(avgRating * 10) / 10,
    totalRatings: ratings.length,
    failureRate: Math.round(failureRate * 10) / 10,
  };
}

/**
 * Get notification performance by school.
 */
export async function getSchoolPerformance(): Promise<
  {
    school_id: string;
    school_name: string;
    notifications_sent: number;
    delivered: number;
    read: number;
    avg_rating: number;
  }[]
> {
  const supabase = await createSupabaseServer() as any;

  // This would ideally be a RPC or a pre-aggregated view
  // For now, we fetch all super admin notifications and aggregate
  const { data, error } = await supabase
  .from("notification_recipients")
    .select(`
      school_id,
      status,
      rating,
      notifications!inner(school_id, sender_role)
    `)
    .eq("notifications.sender_role", "super_admin");

  if (error) {throw new Error(`Failed to fetch school performance: ${error.message}`);}

  const rows = (data ?? []) as any[];
  const bySchool: Record<string, { name: string; sent: number; delivered: number; read: number; ratings: number[] }> = {};

  for (const row of rows) {
    const schoolId = row.school_id;
    if (!bySchool[schoolId]) {
      bySchool[schoolId] = { name: schoolId, sent: 0, delivered: 0, read: 0, ratings: [] };
    }
    if (row.status === "delivered" || row.status === "read") {bySchool[schoolId].delivered++;}
    if (row.status === "read") {bySchool[schoolId].read++;}
    if (row.rating) {bySchool[schoolId].ratings.push(row.rating as number);}
  }

  // Fetch school names
  const schoolIds = Object.keys(bySchool);
  if (schoolIds.length > 0) {
    const { data: schoolsData } = await supabase
    .from("schools")
      .select("id, name")
      .in("id", schoolIds);

    const schools = schoolsData ?? [];
    for (const school of schools) {
      if (bySchool[school.id]) {
        bySchool[school.id].name = school.name;
      }
    }
  }

  return Object.entries(bySchool).map(([schoolId, stats]) => ({
    school_id: schoolId,
    school_name: stats.name,
    notifications_sent: stats.sent,
    delivered: stats.delivered,
    read: stats.read,
    avg_rating: stats.ratings.length > 0
      ? Math.round((stats.ratings.reduce((a, b) => a + b, 0) / stats.ratings.length) * 10) / 10
      : 0,
  }));
}

/**
 * Get rating distribution for analytics.
 */
export async function getRatingDistribution(): Promise<Record<number, number>> {
  const supabase = await createSupabaseServer() as any;

  const { data, error } = await supabase
  .from("notification_recipients")
    .select("rating, notifications(sender_role)")
    .not("rating", "is", null);

  if (error) {throw new Error(`Failed to fetch ratings: ${error.message}`);}

  const rows = (data ?? []) as any[];
  const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const row of rows) {
    const senderRole = (row.notifications as { sender_role: string } | null)?.sender_role;
    if (senderRole !== "super_admin") continue;
    const r = row.rating as number;
    if (r >= 1 && r <= 5) {dist[r]++;}
  }
  return dist;
}

/**
 * Get feedback trends over time.
 */
export async function getFeedbackTrends(
  days: number = 30
): Promise<{ date: string; count: number; avgRating: number }[]> {
  const supabase = await createSupabaseServer() as any;

  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - days);

  const { data, error } = await supabase
  .from("notification_feedback")
    .select("created_at, rating, notifications(sender_role)")
    .gte("created_at", fromDate.toISOString());

  if (error) {throw new Error(`Failed to fetch feedback trends: ${error.message}`);}

  const byDate: Record<string, { count: number; totalRating: number }> = {};

  for (const row of (data ?? []) as any[]) {
    const senderRole = (row.notifications as { sender_role: string } | null)?.sender_role;
    if (senderRole !== "super_admin") continue;
    const date = (row.created_at as string).split("T")[0];
    if (!byDate[date]) {byDate[date] = { count: 0, totalRating: 0 };}
    byDate[date].count++;
    if (row.rating) {byDate[date].totalRating += row.rating as number;}
  }

  return Object.entries(byDate)
    .map(([date, stats]) => ({
      date,
      count: stats.count,
      avgRating: stats.count > 0 ? Math.round((stats.totalRating / stats.count) * 10) / 10 : 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Get feedback by category.
 */
export async function getFeedbackByCategory(): Promise<Record<string, number>> {
  const supabase = await createSupabaseServer() as any;

  const { data, error } = await supabase
  .from("notification_feedback")
    .select("notification_id, notifications(category, sender_role)");

  if (error) {throw new Error(`Failed to fetch feedback categories: ${error.message}`);}

  const byCategory: Record<string, number> = {};
  for (const row of (data ?? []) as any[]) {
    const notif = row.notifications as { category: string; sender_role: string } | null;
    if (notif?.sender_role !== "super_admin") continue;
    const category = notif?.category ?? "uncategorized";
    byCategory[category] = (byCategory[category] ?? 0) + 1;
  }

  return byCategory;
}

/**
 * Get school engagement scores.
 */
export async function getSchoolEngagementScores(): Promise<
  { school_id: string; school_name: string; score: number; feedback_count: number }[]
> {
  const supabase = await createSupabaseServer() as any;

  const { data, error } = await supabase
  .from("notification_feedback")
    .select("school_id, rating, notifications(sender_role)");

  if (error) {throw new Error(`Failed to fetch engagement scores: ${error.message}`);}

  const bySchool: Record<string, { name: string; feedback_count: number; totalRating: number }> = {};

  for (const row of (data ?? []) as any[]) {
    const senderRole = (row.notifications as { sender_role: string } | null)?.sender_role;
    if (senderRole !== "super_admin") continue;
    if (!bySchool[row.school_id]) {
      bySchool[row.school_id] = { name: row.school_id, feedback_count: 0, totalRating: 0 };
    }
    bySchool[row.school_id].feedback_count++;
    if (row.rating) {
      bySchool[row.school_id].totalRating += row.rating as number;
    }
  }

  // Fetch school names
  const schoolIds = Object.keys(bySchool);
  if (schoolIds.length > 0) {
    const { data: schoolsData } = await supabase
    .from("schools")
      .select("id, name")
      .in("id", schoolIds);

    for (const school of schoolsData ?? []) {
      if (bySchool[school.id]) {
        bySchool[school.id].name = school.name;
      }
    }
  }

  return Object.entries(bySchool)
    .map(([schoolId, stats]) => {
      // Engagement score = feedback_count * 2 + avg_rating * 10
      const avgRating = stats.feedback_count > 0 ? stats.totalRating / stats.feedback_count : 0;
      const score = Math.round(stats.feedback_count * 2 + avgRating * 10);
      return {
        school_id: schoolId,
        school_name: stats.name,
        score,
        feedback_count: stats.feedback_count,
      };
    })
    .sort((a, b) => b.score - a.score);
}

/**
 * Get all schools for targeting dropdowns.
 */
export async function getAllSchools(): Promise<{ id: string; name: string }[]> {
  const supabase = await createSupabaseServer() as any;

  const { data, error } = await supabase
  .from("schools")
    .select("id, name")
    .is("deleted_at", null)
    .order("name", { ascending: true });

  if (error) {throw new Error(`Failed to fetch schools: ${error.message}`);}
  return (data ?? []) as { id: string; name: string }[];
}

/**
 * Get tag frequency for feedback.
 */
export async function getTagFrequency(): Promise<Record<string, number>> {
  const supabase = await createSupabaseServer() as any;

  const { data, error } = await supabase
  .from("notification_feedback")
    .select("feedback_text");

  if (error) {throw new Error(`Failed to fetch feedback text: ${error.message}`);}

  const tagCounts: Record<string, number> = {};

  for (const row of (data ?? []) as any[]) {
    const tags = classifyFeedback(row.feedback_text as string);
    for (const tag of tags) {
      tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
    }
  }

  return tagCounts;
}

/**
 * Get weekly feedback summary.
 */
export async function getWeeklyFeedbackSummary(): Promise<{
  thisWeek: number;
  lastWeek: number;
  percentChange: number;
  avgRatingThisWeek: number;
  avgRatingLastWeek: number;
  topTags: { tag: string; count: number }[];
}> {
  const supabase = await createSupabaseServer() as any;

  const now = new Date();
  const oneWeekAgo = new Date(now);
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const twoWeeksAgo = new Date(now);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  const { data: thisWeekData } = await supabase
  .from("notification_feedback")
    .select("rating, feedback_text, notifications(sender_role)")
    .gte("created_at", oneWeekAgo.toISOString());

  const { data: lastWeekData } = await supabase
  .from("notification_feedback")
    .select("rating, feedback_text, notifications(sender_role)")
    .gte("created_at", twoWeeksAgo.toISOString())
    .lt("created_at", oneWeekAgo.toISOString());

  const thisWeek = (thisWeekData ?? []) as any[];
  const lastWeek = (lastWeekData ?? []) as any[];

  const thisWeekRatings = thisWeek.map((r) => r.rating as number).filter(Boolean);
  const lastWeekRatings = lastWeek.map((r) => r.rating as number).filter(Boolean);

  const avgRatingThisWeek = thisWeekRatings.length > 0
    ? thisWeekRatings.reduce((a, b) => a + b, 0) / thisWeekRatings.length
    : 0;
  const avgRatingLastWeek = lastWeekRatings.length > 0
    ? lastWeekRatings.reduce((a, b) => a + b, 0) / lastWeekRatings.length
    : 0;

  const percentChange = lastWeek.length > 0
    ? Math.round(((thisWeek.length - lastWeek.length) / lastWeek.length) * 100)
    : thisWeek.length > 0 ? 100 : 0;

  // Tag frequency this week
  const tagCounts: Record<string, number> = {};
  for (const row of thisWeek) {
    const senderRole = (row.notifications as { sender_role: string } | null)?.sender_role;
    if (senderRole !== "super_admin") continue;
    const tags = classifyFeedback(row.feedback_text as string);
    for (const tag of tags) {
      tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
    }
  }

  const topTags = Object.entries(tagCounts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    thisWeek: thisWeek.length,
    lastWeek: lastWeek.length,
    percentChange,
    avgRatingThisWeek: Math.round(avgRatingThisWeek * 10) / 10,
    avgRatingLastWeek: Math.round(avgRatingLastWeek * 10) / 10,
    topTags,
  };
}
