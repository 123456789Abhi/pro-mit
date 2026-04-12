// ═══════════════════════════════════════════════════════
// NOTIFICATION MODULE — Single Import Point
//
// Usage:
//   import { sendNotification, NotificationType } from "@/lib/notifications";
// ═══════════════════════════════════════════════════════

// Types & Enums
export {
  NotificationType,
  NotificationStatus,
  NotificationPriority,
  NotificationCategory,
  TargetRole,
  SenderRole,
  RecipientStatus,
  DeliveryFailureReason,
  AuditAction,
  SENDER_TARGET_PERMISSIONS,
  RATE_LIMITS,
  ALLOWED_HTML_TAGS,
  MAX_RICH_TEXT_NESTING_DEPTH,
  VALID_STATUS_TRANSITIONS,
  canTransition,
  sanitizeFilename,
  composeNotificationSchema,
  feedbackSchema,
  templateSchema,
  ratingSchema,
  attachmentSchema,
  type ComposeNotificationInput,
  type FeedbackInput,
  type TemplateInput,
  type NotificationRow,
  type NotificationRecipientRow,
  type NotificationFeedbackRow,
  type NotificationAuditRow,
  type ImpersonationLogRow,
  type RecipientPreview,
  type NotificationAttachment,
} from "./types";

// Sanitizer
export { sanitizeHtml, validateMagicBytes } from "./sanitizer";

// Permissions
export {
  getAuthenticatedSender,
  validateSenderTargetPermission,
  validateSchoolScope,
  validateRatingPermission,
  checkRateLimit,
  validateTeacherClassScope,
  AuthenticationError,
  ForbiddenError,
  RateLimitError,
  ServerError,
  type AuthenticatedUser,
} from "./permissions";

// Recipient Resolver
export {
  resolveRecipients,
  previewRecipients,
  filterNotificationsForStudent,
  ZeroRecipientsError,
} from "./recipient-resolver";

// Server Actions
export {
  sendNotification,
  editScheduledNotification,
  pauseNotification,
  resumeNotification,
  cancelNotification,
  submitRating,
  submitFeedback,
  checkAnonymousSafety,
  markNotificationRead,
  retryFailedNotification,
  previewNotificationRecipients,
  startImpersonation,
  endImpersonation,
} from "./actions";
