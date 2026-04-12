import { z } from "zod";

// ═══════════════════════════════════════════════════════
// NOTIFICATION MODULE — CORE TYPES
// Covers: 52 hardening fixes across 14 test categories
// ═══════════════════════════════════════════════════════

// ─────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────

export const NotificationType = {
  STANDARD: "standard",
  RATING_REQUEST: "rating_request",
} as const;
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

export const NotificationStatus = {
  DRAFT: "draft",
  SCHEDULED: "scheduled",
  PAUSED: "paused",
  SENDING: "sending",
  SENT: "sent",
  PARTIALLY_FAILED: "partially_failed", // Fix #40: 28/30 succeed, 2 fail
  CANCELLED: "cancelled",
  FAILED: "failed",
  EXPIRED: "expired", // Fix #39: paused >90 days
} as const;
export type NotificationStatus = (typeof NotificationStatus)[keyof typeof NotificationStatus];

export const NotificationPriority = {
  NORMAL: "normal",
  HIGH: "high",
  URGENT: "urgent",
} as const;
export type NotificationPriority = (typeof NotificationPriority)[keyof typeof NotificationPriority];

export const NotificationCategory = {
  ACADEMIC: "academic",
  ADMINISTRATIVE: "administrative",
  EVENT: "event",
  EMERGENCY: "emergency",
  UPDATE: "update",
} as const;
export type NotificationCategory = (typeof NotificationCategory)[keyof typeof NotificationCategory];

export const TargetRole = {
  PRINCIPAL: "principal",
  TEACHER: "teacher",
  STUDENT: "student",
} as const;
export type TargetRole = (typeof TargetRole)[keyof typeof TargetRole];

export const SenderRole = {
  SUPER_ADMIN: "super_admin",
  PRINCIPAL: "principal",
  TEACHER: "teacher",
} as const;
export type SenderRole = (typeof SenderRole)[keyof typeof SenderRole];

export const RecipientStatus = {
  PENDING: "pending",
  DELIVERED: "delivered",
  READ: "read",
  FAILED: "failed",
} as const;
export type RecipientStatus = (typeof RecipientStatus)[keyof typeof RecipientStatus];

export const DeliveryFailureReason = {
  SCHOOL_DEACTIVATED: "school_deactivated",
  STUDENT_REMOVED: "student_removed",
  USER_DEACTIVATED: "user_deactivated",
  EDGE_FUNCTION_TIMEOUT: "edge_function_timeout",
  DATABASE_ERROR: "database_error",
  UNKNOWN: "unknown",
} as const;
export type DeliveryFailureReason = (typeof DeliveryFailureReason)[keyof typeof DeliveryFailureReason];

export const AuditAction = {
  CREATED: "created",
  EDITED: "edited",
  SCHEDULED: "scheduled",
  SENT: "sent",
  PAUSED: "paused",
  RESUMED: "resumed",
  CANCELLED: "cancelled",
  EXPIRED: "expired",
  RETRIED: "retried",
  DELETED: "deleted",
} as const;
export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];

// ─────────────────────────────────────────────
// Fix #26: Hardcoded sender-role → target-role permission matrix
// This is THE source of truth. Server actions check this, not ad-hoc if/else.
// ─────────────────────────────────────────────
export const SENDER_TARGET_PERMISSIONS: Record<SenderRole, TargetRole[]> = {
  [SenderRole.SUPER_ADMIN]: [TargetRole.PRINCIPAL, TargetRole.TEACHER, TargetRole.STUDENT],
  [SenderRole.PRINCIPAL]: [TargetRole.TEACHER, TargetRole.STUDENT],
  [SenderRole.TEACHER]: [TargetRole.STUDENT],
} as const;

// ─────────────────────────────────────────────
// Rate Limits — Fix #15
// ─────────────────────────────────────────────
export const RATE_LIMITS: Record<SenderRole, { maxPerDay: number; scope: string }> = {
  [SenderRole.SUPER_ADMIN]: { maxPerDay: Infinity, scope: "global" },
  [SenderRole.PRINCIPAL]: { maxPerDay: 10, scope: "school" },
  [SenderRole.TEACHER]: { maxPerDay: 5, scope: "class" },
} as const;

// ─────────────────────────────────────────────
// Fix #33: Blocked URL protocols
// ─────────────────────────────────────────────
const BLOCKED_PROTOCOLS = ["javascript:", "data:", "file:", "vbscript:", "blob:"];

// ─────────────────────────────────────────────
// Fix #13: Allowed HTML tags for rich text sanitization
// ─────────────────────────────────────────────
export const ALLOWED_HTML_TAGS = [
  "p", "b", "i", "strong", "em", "u", "s",
  "ul", "ol", "li",
  "a", "br", "hr",
  "h1", "h2", "h3",
  "blockquote", "code",
] as const;

// Max nesting depth for rich text — Fix #31
export const MAX_RICH_TEXT_NESTING_DEPTH = 3;

// ─────────────────────────────────────────────
// Zod Schemas — All validation in one place
// ─────────────────────────────────────────────

// Fix #32: Filename sanitizer
export function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, "_") // Replace special chars with underscore
    .replace(/_{2,}/g, "_")             // Collapse multiple underscores
    .replace(/^_|_$/g, "")              // Trim leading/trailing underscores
    .slice(0, 200);                     // Max 200 chars
}

// Fix #33: Safe URL validation
const safeUrlSchema = z
  .string()
  .url("Must be a valid URL")
  .refine(
    (url) => {
      const lower = url.toLowerCase().trim();
      return BLOCKED_PROTOCOLS.every((protocol) => !lower.startsWith(protocol));
    },
    { message: "URL protocol not allowed. Use http:// or https:// only." }
  )
  .refine(
    (url) => {
      const lower = url.toLowerCase().trim();
      return lower.startsWith("http://") || lower.startsWith("https://");
    },
    { message: "URL must start with http:// or https://" }
  );

// Fix #14: Attachment validation with MIME + size
export const attachmentSchema = z.object({
  filename: z.string().min(1).max(200).transform(sanitizeFilename),
  mimeType: z.enum([
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/jpg",
  ]),
  sizeBytes: z.number().int().min(1).max(5 * 1024 * 1024), // Max 5MB
  storageUrl: z.string().url(),
});
export type NotificationAttachment = z.infer<typeof attachmentSchema>;

// Fix #34: Rating validation (1-5 integer only)
export const ratingSchema = z.number().int().min(1).max(5);

// Fix #29, #30: Body validation — trimmed, min 10, max 10,000
const bodySchema = z
  .string()
  .transform((val) => val.trim())
  .pipe(
    z.string()
      .min(10, "Message body must be at least 10 characters after trimming whitespace")
      .max(10000, "Message body cannot exceed 10,000 characters")
  );

// Fix #36: Schedule must be at least 15 minutes ahead, max 90 days
const scheduleSchema = z
  .string()
  .datetime()
  .refine(
    (dt) => {
      const scheduled = new Date(dt);
      const minTime = new Date(Date.now() + 15 * 60 * 1000); // 15 min from now
      return scheduled >= minTime;
    },
    { message: "Scheduled time must be at least 15 minutes from now" }
  )
  .refine(
    (dt) => {
      const scheduled = new Date(dt);
      const maxTime = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days
      return scheduled <= maxTime;
    },
    { message: "Cannot schedule more than 90 days ahead" }
  );

// Main notification compose schema
export const composeNotificationSchema = z.object({
  type: z.nativeEnum(NotificationType).default(NotificationType.STANDARD),
  title: z
    .string()
    .transform((val) => val.trim())
    .pipe(z.string().min(3, "Title must be at least 3 characters")),
  body: bodySchema,
  priority: z.nativeEnum(NotificationPriority).default(NotificationPriority.NORMAL),
  category: z.nativeEnum(NotificationCategory).optional(),
  attachments: z.array(attachmentSchema).max(3, "Maximum 3 attachments").default([]),
  links: z.array(safeUrlSchema).max(5, "Maximum 5 links").default([]),
  isPinned: z.boolean().default(false),
  hasRating: z.boolean().default(false),
  templateId: z.string().uuid().optional(),

  // Targeting
  targetRole: z.nativeEnum(TargetRole),
  targetSchools: z.array(z.string().uuid()).min(1, "Select at least one school"),
  targetDepartments: z.array(z.string()).optional(),
  targetGrades: z.array(z.number().int().min(6).max(12)).optional(),
  targetStreams: z.array(z.string()).optional(),

  // Delivery
  sendNow: z.boolean(),
  scheduledAt: scheduleSchema.optional(),
}).refine(
  (data) => {
    // If not sending now, schedule is required
    if (!data.sendNow && !data.scheduledAt) {
      return false;
    }
    return true;
  },
  { message: "Either send now or provide a scheduled time", path: ["scheduledAt"] }
).refine(
  (data) => {
    // Only super_admin can use rating requests — validated at server action level
    // Students targeted must have grades selected
    if (data.targetRole === TargetRole.STUDENT && (!data.targetGrades || data.targetGrades.length === 0)) {
      return false;
    }
    return true;
  },
  { message: "Select at least one class for student notifications", path: ["targetGrades"] }
);

export type ComposeNotificationInput = z.infer<typeof composeNotificationSchema>;

// Feedback schema — Fix #45, #46
export const feedbackSchema = z.object({
  notificationId: z.string().uuid(),
  feedbackText: z
    .string()
    .transform((val) => val.trim())
    .pipe(
      z.string()
        .min(10, "Feedback must be at least 10 characters")
        .max(5000, "Feedback cannot exceed 5,000 characters")
    ),
  isAnonymous: z.boolean().default(false),
});
export type FeedbackInput = z.infer<typeof feedbackSchema>;

// Template schema
export const templateSchema = z.object({
  title: z.string().min(3).max(200),
  body: bodySchema,
  priority: z.nativeEnum(NotificationPriority).default(NotificationPriority.NORMAL),
  category: z.nativeEnum(NotificationCategory).optional(),
  hasRating: z.boolean().default(false),
});
export type TemplateInput = z.infer<typeof templateSchema>;

// ─────────────────────────────────────────────
// Status machine — valid transitions
// ─────────────────────────────────────────────
export const VALID_STATUS_TRANSITIONS: Record<NotificationStatus, NotificationStatus[]> = {
  [NotificationStatus.DRAFT]: [NotificationStatus.SENDING, NotificationStatus.SCHEDULED, NotificationStatus.CANCELLED],
  [NotificationStatus.SCHEDULED]: [NotificationStatus.SENDING, NotificationStatus.PAUSED, NotificationStatus.CANCELLED],
  [NotificationStatus.PAUSED]: [NotificationStatus.SCHEDULED, NotificationStatus.CANCELLED, NotificationStatus.EXPIRED],
  [NotificationStatus.SENDING]: [NotificationStatus.SENT, NotificationStatus.PARTIALLY_FAILED, NotificationStatus.FAILED],
  [NotificationStatus.SENT]: [], // Terminal state
  [NotificationStatus.PARTIALLY_FAILED]: [NotificationStatus.SENDING], // Retry
  [NotificationStatus.CANCELLED]: [], // Terminal state
  [NotificationStatus.FAILED]: [NotificationStatus.SENDING], // Retry
  [NotificationStatus.EXPIRED]: [], // Terminal state
};

export function canTransition(from: NotificationStatus, to: NotificationStatus): boolean {
  return VALID_STATUS_TRANSITIONS[from].includes(to);
}

// ─────────────────────────────────────────────
// Database interfaces — what the tables look like
// ─────────────────────────────────────────────

export interface NotificationRow {
  id: string;
  school_id: string | null;
  sender_id: string;
  sender_role: SenderRole;
  type: NotificationType;
  title: string;
  body: string;
  priority: NotificationPriority;
  category: NotificationCategory | null;
  attachments: NotificationAttachment[];
  links: string[];
  is_pinned: boolean;
  has_rating: boolean;
  template_id: string | null;
  target_role: TargetRole;
  target_schools: string[];
  target_departments: string[] | null;
  target_grades: number[] | null;
  target_streams: string[] | null;
  status: NotificationStatus;
  version: number; // Fix #5: optimistic locking
  scheduled_at: string | null;
  sent_at: string | null;
  cancelled_at: string | null;
  deleted_at: string | null; // Fix #43: soft delete
  delivered_count: number; // Fix #3: denormalized
  read_count: number;
  failed_count: number;
  skipped_schools: number; // Fix #41: silent skip count
  created_at: string;
}

export interface NotificationRecipientRow {
  id: string;
  notification_id: string;
  recipient_id: string;
  school_id: string;
  status: RecipientStatus;
  failure_reason: DeliveryFailureReason | null; // Fix #7: error attribution
  delivered_at: string | null;
  read_at: string | null;
  rating: number | null;
  rated_at: string | null;
  created_at: string;
}

export interface NotificationFeedbackRow {
  id: string;
  notification_id: string;
  sender_id: string;
  school_id: string;
  feedback_text: string;
  is_anonymous: boolean;
  created_at: string;
}

export interface NotificationAuditRow {
  id: string;
  notification_id: string;
  actor_id: string;
  action: AuditAction;
  changes: Record<string, unknown> | null;
  ip_address: string;
  created_at: string;
}

export interface ImpersonationLogRow {
  id: string;
  admin_id: string;
  target_school_id: string;
  target_user_id: string;
  started_at: string;
  ended_at: string | null;
  actions_performed: Array<{ action: string; timestamp: string; details: string }>;
  ip_address: string;
}

// ─────────────────────────────────────────────
// Recipient preview — Fix #17
// ─────────────────────────────────────────────
export interface RecipientPreview {
  totalSchools: number;
  schoolsWithRecipients: number;
  skippedSchools: number; // Schools with 0 matching recipients
  skippedSchoolNames: string[];
  totalRecipients: number;
  recipientsBySchool: Array<{
    schoolId: string;
    schoolName: string;
    recipientCount: number;
  }>;
}
