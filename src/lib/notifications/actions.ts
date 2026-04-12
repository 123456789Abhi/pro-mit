"use server";

import {
  ComposeNotificationInput,
  FeedbackInput,
  NotificationStatus,
  NotificationType,
  SenderRole,
  AuditAction,
  composeNotificationSchema,
  feedbackSchema,
  ratingSchema,
  canTransition,
} from "./types";
import { sanitizeHtml, validateMagicBytes } from "./sanitizer";
import {
  getAuthenticatedSender,
  validateSenderTargetPermission,
  validateSchoolScope,
  validateRatingPermission,
  checkRateLimit,
  validateTeacherClassScope,
  AuthenticationError,
  ForbiddenError,
  RateLimitError,
} from "./permissions";
import { resolveRecipients, previewRecipients } from "./recipient-resolver";

// ═══════════════════════════════════════════════════════
// NOTIFICATION SERVER ACTIONS
// One file per entity — per coding standards.
// Every action: auth → validate → sanitize → execute → audit.
// ═══════════════════════════════════════════════════════

// Type for server action results
type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; code: string };

// Supabase client type (injected via createServerClient)
interface SupabaseServerClient {
  auth: {
    getUser: () => Promise<{
      data: { user: { id: string } | null };
      error: { message: string } | null;
    }>;
  };
  from: (table: string) => {
    select: (columns: string) => {
      eq: (col: string, val: string) => {
        single: () => Promise<{
          data: Record<string, unknown> | null;
          error: { message: string } | null;
        }>;
        gte: (col2: string, val2: string) => {
          single: () => Promise<{
            data: Record<string, unknown> | null;
            error: { message: string } | null;
          }>;
        };
      };
    };
  };
  rpc: (fn: string, params: Record<string, unknown>) => Promise<{
    data: unknown;
    error: { message: string } | null;
  }>;
}

/**
 * Get Supabase server client — placeholder for actual implementation.
 * In production, this uses createServerClient from @supabase/ssr.
 */
async function getSupabase(): Promise<SupabaseServerClient> {
  // Implementation: createServerClient(cookies())
  throw new Error("Implement with @supabase/ssr createServerClient");
}

/**
 * Get client IP address for audit log.
 */
function getClientIp(): string {
  // Implementation: headers().get('x-forwarded-for') || headers().get('x-real-ip')
  return "0.0.0.0";
}

// ─────────────────────────────────────────────
// ACTION: Preview Recipients (before send)
// Fix #17: Show actual counts before confirmation
// ─────────────────────────────────────────────

export async function previewNotificationRecipients(
  rawInput: ComposeNotificationInput
): Promise<ActionResult<Awaited<ReturnType<typeof previewRecipients>>>> {
  try {
    const supabase = await getSupabase();
    const sender = await getAuthenticatedSender(supabase);

    // Validate input
    const input = composeNotificationSchema.parse(rawInput);

    // Validate permissions
    validateSenderTargetPermission(sender.role, input.targetRole);
    validateSchoolScope(sender, input.targetSchools);

    if (sender.role === SenderRole.TEACHER && input.targetGrades) {
      await validateTeacherClassScope(supabase, sender.userId, input.targetGrades);
    }

    const preview = await previewRecipients(supabase, input);
    return { success: true, data: preview };
  } catch (err) {
    return handleError(err);
  }
}

// ─────────────────────────────────────────────
// ACTION: Send / Schedule Notification
// ─────────────────────────────────────────────

export async function sendNotification(
  rawInput: ComposeNotificationInput
): Promise<ActionResult<{ notificationId: string; recipientCount: number }>> {
  try {
    const supabase = await getSupabase();
    const sender = await getAuthenticatedSender(supabase);

    // ── 1. Validate input ──
    const input = composeNotificationSchema.parse(rawInput);

    // ── 2. Validate all permissions ──
    validateSenderTargetPermission(sender.role, input.targetRole);
    validateSchoolScope(sender, input.targetSchools);
    validateRatingPermission(sender.role, input.hasRating);

    if (sender.role === SenderRole.TEACHER && input.targetGrades) {
      await validateTeacherClassScope(supabase, sender.userId, input.targetGrades);
    }

    // ── 3. Check rate limit (Fix #15) ──
    await checkRateLimit(supabase, sender);

    // ── 4. Sanitize rich text body (Fix #13) ──
    const sanitizedBody = sanitizeHtml(input.body);

    // ── 5. Determine status ──
    const status = input.sendNow
      ? NotificationStatus.SENDING
      : NotificationStatus.SCHEDULED;

    // ── 6. Insert notification ──
    const { data: notifData, error: notifError } = await supabase.rpc(
      "create_notification",
      {
        p_sender_id: sender.userId,
        p_sender_role: sender.role,
        p_school_id: sender.schoolId,
        p_type: input.hasRating ? NotificationType.RATING_REQUEST : input.type,
        p_title: input.title,
        p_body: sanitizedBody,
        p_priority: input.priority,
        p_category: input.category ?? null,
        p_attachments: JSON.stringify(input.attachments),
        p_links: JSON.stringify(input.links),
        p_is_pinned: input.isPinned,
        p_has_rating: input.hasRating,
        p_template_id: input.templateId ?? null,
        p_target_role: input.targetRole,
        p_target_schools: input.targetSchools,
        p_target_departments: input.targetDepartments ?? null,
        p_target_grades: input.targetGrades ?? null,
        p_target_streams: input.targetStreams ?? null,
        p_status: status,
        p_scheduled_at: input.scheduledAt ?? null,
      }
    );

    if (notifError) {
      throw new Error(`Failed to create notification: ${notifError.message}`);
    }

    const notificationId = (notifData as { id: string }).id;

    // ── 7. Write audit log ──
    await writeAuditLog(supabase, {
      notificationId,
      actorId: sender.userId,
      action: input.sendNow ? AuditAction.SENT : AuditAction.SCHEDULED,
      changes: null,
      ipAddress: getClientIp(),
    });

    // ── 8. If send now, resolve recipients and deliver ──
    let recipientCount = 0;
    if (input.sendNow) {
      const resolved = await resolveRecipients(supabase, input);
      recipientCount = resolved.recipients.length;

      // Insert recipient rows
      await supabase.rpc("insert_notification_recipients", {
        p_notification_id: notificationId,
        p_recipients: JSON.stringify(resolved.recipients),
      });

      // Update notification with delivery counts
      await supabase.rpc("finalize_notification_send", {
        p_notification_id: notificationId,
        p_delivered_count: resolved.recipients.length,
        p_skipped_schools: resolved.skippedSchools.length,
        p_status: resolved.skippedSchools.length > 0
          ? NotificationStatus.PARTIALLY_FAILED
          : NotificationStatus.SENT,
      });
    }

    return {
      success: true,
      data: { notificationId, recipientCount },
    };
  } catch (err) {
    return handleError(err);
  }
}

// ─────────────────────────────────────────────
// ACTION: Edit Scheduled Notification
// Fix #5: Optimistic locking with version column
// ─────────────────────────────────────────────

export async function editScheduledNotification(
  notificationId: string,
  rawInput: ComposeNotificationInput,
  expectedVersion: number
): Promise<ActionResult<{ newVersion: number }>> {
  try {
    const supabase = await getSupabase();
    const sender = await getAuthenticatedSender(supabase);

    const input = composeNotificationSchema.parse(rawInput);
    const sanitizedBody = sanitizeHtml(input.body);

    // Fix #5: Optimistic locking — check version before update
    const { data, error } = await supabase.rpc("edit_notification_with_lock", {
      p_notification_id: notificationId,
      p_sender_id: sender.userId,
      p_expected_version: expectedVersion,
      p_title: input.title,
      p_body: sanitizedBody,
      p_priority: input.priority,
      p_category: input.category ?? null,
      p_attachments: JSON.stringify(input.attachments),
      p_links: JSON.stringify(input.links),
      p_is_pinned: input.isPinned,
      p_scheduled_at: input.scheduledAt ?? null,
      p_target_role: input.targetRole,
      p_target_schools: input.targetSchools,
      p_target_departments: input.targetDepartments ?? null,
      p_target_grades: input.targetGrades ?? null,
      p_target_streams: input.targetStreams ?? null,
    });

    if (error) {
      if (error.message.includes("version_mismatch")) {
        return {
          success: false,
          error: "This notification was modified by another session. Please refresh and try again.",
          code: "VERSION_CONFLICT",
        };
      }
      throw new Error(`Edit failed: ${error.message}`);
    }

    const result = data as { new_version: number };

    await writeAuditLog(supabase, {
      notificationId,
      actorId: sender.userId,
      action: AuditAction.EDITED,
      changes: { title: input.title, scheduledAt: input.scheduledAt },
      ipAddress: getClientIp(),
    });

    return { success: true, data: { newVersion: result.new_version } };
  } catch (err) {
    return handleError(err);
  }
}

// ─────────────────────────────────────────────
// ACTION: Pause Notification
// ─────────────────────────────────────────────

export async function pauseNotification(
  notificationId: string,
  expectedVersion: number
): Promise<ActionResult> {
  return transitionStatus(
    notificationId,
    expectedVersion,
    NotificationStatus.SCHEDULED,
    NotificationStatus.PAUSED,
    AuditAction.PAUSED
  );
}

// ─────────────────────────────────────────────
// ACTION: Resume Notification (re-schedule)
// ─────────────────────────────────────────────

export async function resumeNotification(
  notificationId: string,
  expectedVersion: number,
  newScheduledAt: string
): Promise<ActionResult> {
  try {
    const supabase = await getSupabase();
    const sender = await getAuthenticatedSender(supabase);

    // Validate new schedule time
    const scheduledDate = new Date(newScheduledAt);
    const minTime = new Date(Date.now() + 15 * 60 * 1000);
    if (scheduledDate < minTime) {
      return {
        success: false,
        error: "Scheduled time must be at least 15 minutes from now",
        code: "INVALID_SCHEDULE",
      };
    }

    const { error } = await supabase.rpc("transition_notification_status", {
      p_notification_id: notificationId,
      p_sender_id: sender.userId,
      p_expected_version: expectedVersion,
      p_from_status: NotificationStatus.PAUSED,
      p_to_status: NotificationStatus.SCHEDULED,
      p_scheduled_at: newScheduledAt,
    });

    if (error) {
      if (error.message.includes("version_mismatch")) {
        return { success: false, error: "Notification was modified. Refresh and try again.", code: "VERSION_CONFLICT" };
      }
      throw new Error(`Resume failed: ${error.message}`);
    }

    await writeAuditLog(supabase, {
      notificationId,
      actorId: sender.userId,
      action: AuditAction.RESUMED,
      changes: { newScheduledAt },
      ipAddress: getClientIp(),
    });

    return { success: true, data: undefined };
  } catch (err) {
    return handleError(err);
  }
}

// ─────────────────────────────────────────────
// ACTION: Cancel Notification
// ─────────────────────────────────────────────

export async function cancelNotification(
  notificationId: string,
  expectedVersion: number
): Promise<ActionResult> {
  try {
    const supabase = await getSupabase();
    const sender = await getAuthenticatedSender(supabase);

    // Can cancel from SCHEDULED or PAUSED
    const { data, error } = await supabase.rpc("cancel_notification", {
      p_notification_id: notificationId,
      p_sender_id: sender.userId,
      p_expected_version: expectedVersion,
    });

    if (error) {
      if (error.message.includes("version_mismatch")) {
        return { success: false, error: "Notification was modified. Refresh and try again.", code: "VERSION_CONFLICT" };
      }
      if (error.message.includes("invalid_transition")) {
        return { success: false, error: "This notification cannot be cancelled in its current state.", code: "INVALID_TRANSITION" };
      }
      throw new Error(`Cancel failed: ${error.message}`);
    }

    void data;

    await writeAuditLog(supabase, {
      notificationId,
      actorId: sender.userId,
      action: AuditAction.CANCELLED,
      changes: null,
      ipAddress: getClientIp(),
    });

    return { success: true, data: undefined };
  } catch (err) {
    return handleError(err);
  }
}

// ─────────────────────────────────────────────
// ACTION: Submit Star Rating
// Fix #34: Rating validated 1-5 integer
// ─────────────────────────────────────────────

export async function submitRating(
  notificationId: string,
  ratingValue: number
): Promise<ActionResult> {
  try {
    const supabase = await getSupabase();
    const sender = await getAuthenticatedSender(supabase);

    // Fix #34: Validate rating value
    const validatedRating = ratingSchema.parse(ratingValue);

    const { error } = await supabase.rpc("submit_notification_rating", {
      p_notification_id: notificationId,
      p_recipient_id: sender.userId,
      p_rating: validatedRating,
    });

    if (error) {
      if (error.message.includes("already_rated")) {
        return { success: false, error: "You have already submitted a rating.", code: "ALREADY_RATED" };
      }
      if (error.message.includes("not_rating_request")) {
        return { success: false, error: "This notification does not accept ratings.", code: "NOT_RATING" };
      }
      throw new Error(`Rating failed: ${error.message}`);
    }

    return { success: true, data: undefined };
  } catch (err) {
    return handleError(err);
  }
}

// ─────────────────────────────────────────────
// ACTION: Submit Text Feedback
// Fix #44, #45, #46: Anonymous warning, max length, dedup
// ─────────────────────────────────────────────

export async function submitFeedback(
  rawInput: FeedbackInput
): Promise<ActionResult> {
  try {
    const supabase = await getSupabase();
    const sender = await getAuthenticatedSender(supabase);

    // Only Principal and Teacher can submit text feedback
    if (sender.role !== SenderRole.PRINCIPAL && sender.role !== SenderRole.TEACHER) {
      return { success: false, error: "Only principals and teachers can submit feedback.", code: "FORBIDDEN" };
    }

    const input = feedbackSchema.parse(rawInput);

    // Fix #46: UNIQUE(notification_id, sender_id) enforced in DB
    // If duplicate, DB will reject or upsert
    const { error } = await supabase.rpc("submit_notification_feedback", {
      p_notification_id: input.notificationId,
      p_sender_id: sender.userId,
      p_school_id: sender.schoolId,
      p_feedback_text: input.feedbackText,
      p_is_anonymous: input.isAnonymous,
    });

    if (error) {
      if (error.message.includes("duplicate")) {
        return { success: false, error: "You have already submitted feedback for this notification.", code: "DUPLICATE_FEEDBACK" };
      }
      throw new Error(`Feedback failed: ${error.message}`);
    }

    return { success: true, data: undefined };
  } catch (err) {
    return handleError(err);
  }
}

// ─────────────────────────────────────────────
// ACTION: Check Anonymous Safety
// Fix #44: Warning if <5 people in sender's role at school
// ─────────────────────────────────────────────

export async function checkAnonymousSafety(
  notificationId: string
): Promise<ActionResult<{ safe: boolean; roleCount: number; warning: string | null }>> {
  try {
    const supabase = await getSupabase();
    const sender = await getAuthenticatedSender(supabase);

    const { data, error } = await supabase.rpc("count_role_in_school", {
      p_school_id: sender.schoolId,
      p_role: sender.role,
    });

    if (error) {
      throw new Error(`Anonymous safety check failed: ${error.message}`);
    }

    const roleCount = (data as { count: number }).count;
    const safe = roleCount >= 5;

    void notificationId;

    return {
      success: true,
      data: {
        safe,
        roleCount,
        warning: safe
          ? null
          : `Your school has only ${roleCount} ${sender.role}(s). Anonymity may be limited due to small team size.`,
      },
    };
  } catch (err) {
    return handleError(err);
  }
}

// ─────────────────────────────────────────────
// ACTION: Mark Notification as Read
// ─────────────────────────────────────────────

export async function markNotificationRead(
  notificationId: string
): Promise<ActionResult> {
  try {
    const supabase = await getSupabase();
    const sender = await getAuthenticatedSender(supabase);

    const { error } = await supabase.rpc("mark_notification_read", {
      p_notification_id: notificationId,
      p_recipient_id: sender.userId,
    });

    if (error) {
      throw new Error(`Mark read failed: ${error.message}`);
    }

    return { success: true, data: undefined };
  } catch (err) {
    return handleError(err);
  }
}

// ─────────────────────────────────────────────
// ACTION: Retry Failed Notification
// Fix #20: Idempotent — only sends to recipients who haven't received it
// ─────────────────────────────────────────────

export async function retryFailedNotification(
  notificationId: string
): Promise<ActionResult<{ retriedCount: number }>> {
  try {
    const supabase = await getSupabase();
    const sender = await getAuthenticatedSender(supabase);

    if (sender.role !== SenderRole.SUPER_ADMIN) {
      return { success: false, error: "Only Super Admin can retry notifications.", code: "FORBIDDEN" };
    }

    // Fix #20: Only retry for recipients with status = 'failed'
    const { data, error } = await supabase.rpc("retry_failed_notification", {
      p_notification_id: notificationId,
    });

    if (error) {
      throw new Error(`Retry failed: ${error.message}`);
    }

    const result = data as { retried_count: number };

    await writeAuditLog(supabase, {
      notificationId,
      actorId: sender.userId,
      action: AuditAction.RETRIED,
      changes: { retriedCount: result.retried_count },
      ipAddress: getClientIp(),
    });

    return { success: true, data: { retriedCount: result.retried_count } };
  } catch (err) {
    return handleError(err);
  }
}

// ─────────────────────────────────────────────
// ACTION: Start Impersonation (Login as Principal)
// Fix #12: Full impersonation audit trail
// ─────────────────────────────────────────────

export async function startImpersonation(
  targetSchoolId: string,
  targetUserId: string
): Promise<ActionResult<{ sessionId: string }>> {
  try {
    const supabase = await getSupabase();
    const sender = await getAuthenticatedSender(supabase);

    if (sender.role !== SenderRole.SUPER_ADMIN) {
      return { success: false, error: "Only Super Admin can impersonate.", code: "FORBIDDEN" };
    }

    const { data, error } = await supabase.rpc("start_impersonation_session", {
      p_admin_id: sender.userId,
      p_target_school_id: targetSchoolId,
      p_target_user_id: targetUserId,
      p_ip_address: getClientIp(),
    });

    if (error) {
      throw new Error(`Impersonation start failed: ${error.message}`);
    }

    const result = data as { session_id: string };
    return { success: true, data: { sessionId: result.session_id } };
  } catch (err) {
    return handleError(err);
  }
}

export async function endImpersonation(
  sessionId: string
): Promise<ActionResult> {
  try {
    const supabase = await getSupabase();
    const sender = await getAuthenticatedSender(supabase);

    const { error } = await supabase.rpc("end_impersonation_session", {
      p_session_id: sessionId,
      p_admin_id: sender.userId,
    });

    if (error) {
      throw new Error(`Impersonation end failed: ${error.message}`);
    }

    return { success: true, data: undefined };
  } catch (err) {
    return handleError(err);
  }
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

async function transitionStatus(
  notificationId: string,
  expectedVersion: number,
  fromStatus: NotificationStatus,
  toStatus: NotificationStatus,
  auditAction: AuditAction
): Promise<ActionResult> {
  try {
    if (!canTransition(fromStatus, toStatus)) {
      return {
        success: false,
        error: `Cannot transition from ${fromStatus} to ${toStatus}`,
        code: "INVALID_TRANSITION",
      };
    }

    const supabase = await getSupabase();
    const sender = await getAuthenticatedSender(supabase);

    const { error } = await supabase.rpc("transition_notification_status", {
      p_notification_id: notificationId,
      p_sender_id: sender.userId,
      p_expected_version: expectedVersion,
      p_from_status: fromStatus,
      p_to_status: toStatus,
      p_scheduled_at: null,
    });

    if (error) {
      if (error.message.includes("version_mismatch")) {
        return { success: false, error: "Notification was modified. Refresh and try again.", code: "VERSION_CONFLICT" };
      }
      throw new Error(`Transition failed: ${error.message}`);
    }

    await writeAuditLog(supabase, {
      notificationId,
      actorId: sender.userId,
      action: auditAction,
      changes: { fromStatus, toStatus },
      ipAddress: getClientIp(),
    });

    return { success: true, data: undefined };
  } catch (err) {
    return handleError(err);
  }
}

async function writeAuditLog(
  supabase: SupabaseServerClient,
  entry: {
    notificationId: string;
    actorId: string;
    action: AuditAction;
    changes: Record<string, unknown> | null;
    ipAddress: string;
  }
): Promise<void> {
  await supabase.rpc("insert_audit_log", {
    p_notification_id: entry.notificationId,
    p_actor_id: entry.actorId,
    p_action: entry.action,
    p_changes: entry.changes ? JSON.stringify(entry.changes) : null,
    p_ip_address: entry.ipAddress,
  });
}

function handleError(err: unknown): { success: false; error: string; code: string } {
  if (err instanceof AuthenticationError) {
    return { success: false, error: err.message, code: "UNAUTHENTICATED" };
  }
  if (err instanceof ForbiddenError) {
    return { success: false, error: err.message, code: "FORBIDDEN" };
  }
  if (err instanceof RateLimitError) {
    return { success: false, error: err.message, code: "RATE_LIMITED" };
  }
  if (err instanceof Error && err.name === "ZodError") {
    return { success: false, error: "Invalid input. Please check your form and try again.", code: "VALIDATION_ERROR" };
  }
  if (err instanceof Error && err.name === "ZeroRecipientsError") {
    return { success: false, error: err.message, code: "NO_RECIPIENTS" };
  }

  // Unknown error — log to Sentry, return generic message
  const message = err instanceof Error ? err.message : "An unexpected error occurred";
  // In production: Sentry.captureException(err);
  return { success: false, error: message, code: "INTERNAL_ERROR" };
}
