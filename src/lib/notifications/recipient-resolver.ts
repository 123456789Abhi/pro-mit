import {
  TargetRole,
  RecipientPreview,
  ComposeNotificationInput,
} from "./types";

// ═══════════════════════════════════════════════════════
// RECIPIENT RESOLVER — Fixes #17, #35, #40, #41
// Resolves targeting criteria into actual user IDs.
// Called at SEND TIME (not at schedule time) so new
// students enrolled after scheduling still receive it.
// ═══════════════════════════════════════════════════════

interface SupabaseServerClient {
  rpc: (fn: string, params: Record<string, unknown>) => Promise<{
    data: unknown;
    error: { message: string } | null;
  }>;
}

interface ResolvedRecipient {
  userId: string;
  schoolId: string;
  enrolledAt: string; // Used to filter out pre-enrollment notifications
}

interface ResolveResult {
  recipients: ResolvedRecipient[];
  totalSchools: number;
  schoolsWithRecipients: number;
  skippedSchools: Array<{ schoolId: string; schoolName: string; reason: string }>;
}

/**
 * Resolves notification targeting into actual recipient user IDs.
 *
 * Called at SEND TIME:
 * - Scheduled notifications resolve recipients when the Edge Function fires
 * - "Send Now" resolves immediately before sending
 *
 * Fix #35: Zero-recipient guard — returns error if no recipients found.
 * Fix #41: Schools with 0 matching recipients are silently skipped with reason.
 */
export async function resolveRecipients(
  supabase: SupabaseServerClient,
  input: ComposeNotificationInput
): Promise<ResolveResult> {
  const { data, error } = await supabase.rpc("resolve_notification_recipients", {
    p_target_role: input.targetRole,
    p_target_schools: input.targetSchools,
    p_target_departments: input.targetDepartments ?? null,
    p_target_grades: input.targetGrades ?? null,
    p_target_streams: input.targetStreams ?? null,
  });

  if (error) {
    throw new Error(`Failed to resolve recipients: ${error.message}`);
  }

  const result = data as {
    recipients: ResolvedRecipient[];
    total_schools: number;
    schools_with_recipients: number;
    skipped_schools: Array<{ school_id: string; school_name: string; reason: string }>;
  };

  // Fix #35: Zero-recipient guard
  if (result.recipients.length === 0) {
    const skipped = (result.skipped_schools as any[]).map((s: any) => ({
      schoolId: s.school_id,
      schoolName: s.school_name,
      reason: s.reason,
    }));
    throw new ZeroRecipientsError(
      input.targetRole,
      input.targetSchools.length,
      skipped
    );
  }

  return {
    recipients: result.recipients,
    totalSchools: result.total_schools,
    schoolsWithRecipients: result.schools_with_recipients,
    skippedSchools: (result.skipped_schools as any[]).map((s: any) => ({
      schoolId: s.school_id,
      schoolName: s.school_name,
      reason: s.reason,
    })),
  };
}

/**
 * Preview recipients WITHOUT actually resolving.
 * Used in the Compose → Confirmation step.
 *
 * Fix #17: Shows actual counts before sending.
 * "This notification will reach: 27 schools, 3 skipped, 4,500 students."
 */
export async function previewRecipients(
  supabase: SupabaseServerClient,
  input: ComposeNotificationInput
): Promise<RecipientPreview> {
  const { data, error } = await supabase.rpc("preview_notification_recipients", {
    p_target_role: input.targetRole,
    p_target_schools: input.targetSchools,
    p_target_departments: input.targetDepartments ?? null,
    p_target_grades: input.targetGrades ?? null,
    p_target_streams: input.targetStreams ?? null,
  });

  if (error) {
    throw new Error(`Failed to preview recipients: ${error.message}`);
  }

  const preview = data as {
    total_schools: number;
    schools_with_recipients: number;
    skipped_schools: number;
    skipped_school_names: string[];
    total_recipients: number;
    recipients_by_school: Array<{
      school_id: string;
      school_name: string;
      recipient_count: number;
    }>;
  };

  return {
    totalSchools: preview.total_schools,
    schoolsWithRecipients: preview.schools_with_recipients,
    skippedSchools: preview.skipped_schools,
    skippedSchoolNames: preview.skipped_school_names,
    totalRecipients: preview.total_recipients,
    recipientsBySchool: preview.recipients_by_school.map((s) => ({
      schoolId: s.school_id,
      schoolName: s.school_name,
      recipientCount: s.recipient_count,
    })),
  };
}

/**
 * Filters out recipients who enrolled AFTER the notification was created.
 * Actually — we want the OPPOSITE: include only students enrolled BEFORE
 * or ON the notification send date.
 *
 * But per spec: recipient resolution at send time means new students
 * enrolled after scheduling but before send DO receive it.
 * Students enrolled AFTER send do NOT see old notifications.
 *
 * This function is called when a student LOADS their notification list,
 * not during send.
 */
export function filterNotificationsForStudent(
  notifications: Array<{ id: string; sent_at: string }>,
  studentEnrolledAt: string
): Array<{ id: string; sent_at: string }> {
  const enrollmentDate = new Date(studentEnrolledAt);

  return notifications.filter((n) => {
    const sentDate = new Date(n.sent_at);
    return sentDate >= enrollmentDate; // Only show notifications sent after enrollment
  });
}

// ─────────────────────────────────────────────
// Custom Error
// ─────────────────────────────────────────────

export class ZeroRecipientsError extends Error {
  public readonly targetRole: TargetRole;
  public readonly schoolCount: number;
  public readonly skippedSchools: Array<{ schoolId: string; schoolName: string; reason: string }>;

  constructor(
    targetRole: TargetRole,
    schoolCount: number,
    skippedSchools: Array<{ schoolId: string; schoolName: string; reason: string }>
  ) {
    const reasons = skippedSchools
      .map((s) => `${s.schoolName}: ${s.reason}`)
      .join("; ");
    super(
      `No recipients found. Target: ${targetRole} across ${schoolCount} school(s). ` +
      `Skipped: ${reasons || "none"}`
    );
    this.name = "ZeroRecipientsError";
    this.targetRole = targetRole;
    this.schoolCount = schoolCount;
    this.skippedSchools = skippedSchools;
  }
}
