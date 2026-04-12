"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Bell,
  Send,
  FileText,
  MessageSquare,
  BarChart3,
  Plus,
  Search,
  Pause,
  Play,
  X,
  RefreshCw,
  Eye,
  Edit,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Star,
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Skeleton, SkeletonCard, SkeletonTable } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { classifyFeedback } from "@/lib/utils/feedback";
import {
  getSuperAdminNotifications,
  previewRecipientsAction,
  sendSuperAdminNotification,
  transitionNotificationStatus,
  retryFailedNotification,
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getSuperAdminFeedback,
  getAnalyticsSummary,
  getRatingDistribution,
  getFeedbackTrends,
  getSchoolEngagementScores,
  getWeeklyFeedbackSummary,
  getAllSchools,
  NotificationRow,
  TemplateRow,
  FeedbackRow,
  AnalyticsSummary,
  NotificationFilters,
} from "@/lib/actions/super-admin/communicate";
import {
  NotificationStatus,
  TargetRole,
} from "@/lib/notifications/types";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "success" | "warning" | "danger" | "info" | "outline"; icon: React.ElementType }> = {
  draft: { label: "Draft", variant: "outline", icon: FileText },
  scheduled: { label: "Scheduled", variant: "info", icon: Clock },
  paused: { label: "Paused", variant: "warning", icon: Pause },
  sending: { label: "Sending", variant: "info", icon: RefreshCw },
  sent: { label: "Sent", variant: "success", icon: CheckCircle },
  partially_failed: { label: "Partially Failed", variant: "warning", icon: AlertTriangle },
  cancelled: { label: "Cancelled", variant: "outline", icon: X },
  failed: { label: "Failed", variant: "danger", icon: XCircle },
  expired: { label: "Expired", variant: "outline", icon: Clock },
};

const PRIORITY_CONFIG: Record<string, { label: string; variant: "default" | "success" | "warning" | "danger" | "info" }> = {
  normal: { label: "Normal", variant: "default" },
  high: { label: "High", variant: "warning" },
  urgent: { label: "Urgent", variant: "danger" },
};

const CATEGORY_OPTIONS = [
  { value: "", label: "All Categories" },
  { value: "academic", label: "Academic" },
  { value: "administrative", label: "Administrative" },
  { value: "event", label: "Event" },
  { value: "emergency", label: "Emergency" },
  { value: "update", label: "Update" },
];

const PRIORITY_OPTIONS = [
  { value: "", label: "All Priorities" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "draft", label: "Draft" },
  { value: "scheduled", label: "Scheduled" },
  { value: "paused", label: "Paused" },
  { value: "sending", label: "Sending" },
  { value: "sent", label: "Sent" },
  { value: "partially_failed", label: "Partially Failed" },
  { value: "failed", label: "Failed" },
  { value: "cancelled", label: "Cancelled" },
];

const TARGET_ROLE_OPTIONS = [
  { value: "principal", label: "Principal" },
  { value: "teacher", label: "Teacher" },
  { value: "student", label: "Student" },
];

const FEEDBACK_TAG_LABELS: Record<string, string> = {
  content_quality_positive: "Content Quality (Positive)",
  content_quality_negative: "Content Quality (Negative)",
  platform_issues: "Platform Issues",
  feature_requests: "Feature Requests",
  billing_concerns: "Billing Concerns",
  content_gaps: "Content Gaps",
  ux_feedback: "UX Feedback",
  ai_quality: "AI Quality",
  onboarding_help: "Onboarding Help",
  general: "General",
};

const FEEDBACK_TAG_COLORS: Record<string, string> = {
  content_quality_positive: "bg-success/20 text-success border-success/30",
  content_quality_negative: "bg-danger/20 text-danger border-danger/30",
  platform_issues: "bg-warning/20 text-warning border-warning/30",
  feature_requests: "bg-info/20 text-info border-info/30",
  billing_concerns: "bg-warning/20 text-warning border-warning/30",
  content_gaps: "bg-surface-2 text-text-secondary border-border",
  ux_feedback: "bg-brand/20 text-brand border-brand/30",
  ai_quality: "bg-info/20 text-info border-info/30",
  onboarding_help: "bg-success/20 text-success border-success/30",
  general: "bg-surface-2 text-text-muted border-border",
};

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, trend, trendValue }: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
}) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-text-secondary">{label}</p>
          <p className="mt-1 text-2xl font-bold text-text-primary">{value}</p>
          {trendValue && (
            <div className={cn(
              "mt-1 flex items-center gap-1 text-xs",
              trend === "up" ? "text-success" : trend === "down" ? "text-danger" : "text-text-muted"
            )}>
              {trend === "up" && <TrendingUp className="h-3 w-3" />}
              {trend === "down" && <TrendingDown className="h-3 w-3" />}
              {trend === "neutral" && <Minus className="h-3 w-3" />}
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        <div className="rounded-lg bg-surface-2 p-2">
          <Icon className="h-5 w-5 text-text-secondary" />
        </div>
      </div>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? { label: status, variant: "outline" as const, icon: FileText };
  const Icon = config.icon;
  return (
    <Badge variant={config.variant} className="gap-1">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const config = PRIORITY_CONFIG[priority] ?? { label: priority, variant: "default" as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

function RatingStars({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            "h-3.5 w-3.5",
            i < value ? "fill-warning text-warning" : "text-text-muted"
          )}
        />
      ))}
      <span className="ml-1 text-sm text-text-secondary">{value.toFixed(1)}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSE TAB
// ─────────────────────────────────────────────────────────────────────────────

interface ComposeFormState {
  title: string;
  body: string;
  priority: string;
  category: string;
  targetRole: string;
  targetSchools: string[];
  isPinned: boolean;
  hasRating: boolean;
  sendNow: boolean;
  scheduledAt: string;
}

interface RecipientPreview {
  totalSchools: number;
  totalRecipients: number;
  bySchool: { name: string; count: number }[];
}

function ComposeTab() {
  const [form, setForm] = React.useState<ComposeFormState>({
    title: "",
    body: "",
    priority: "normal",
    category: "",
    targetRole: "principal",
    targetSchools: [],
    isPinned: false,
    hasRating: false,
    sendNow: true,
    scheduledAt: "",
  });
  const [schools, setSchools] = React.useState<{ id: string; name: string }[]>([]);
  const [preview, setPreview] = React.useState<RecipientPreview | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [previewLoading, setPreviewLoading] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  // Fetch schools on mount
  React.useEffect(() => {
    getAllSchools()
      .then(setSchools)
      .catch(() => toast.error("Failed to load schools"));
  }, []);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!form.title.trim() || form.title.trim().length < 3) {
      newErrors.title = "Title must be at least 3 characters";
    }
    if (!form.body.trim() || form.body.trim().length < 10) {
      newErrors.body = "Message body must be at least 10 characters";
    }
    if (form.targetSchools.length === 0) {
      newErrors.targetSchools = "Select at least one school";
    }
    if (!form.sendNow && !form.scheduledAt) {
      newErrors.scheduledAt = "Select a scheduled time or send now";
    }
    if (!form.sendNow && form.scheduledAt) {
      const scheduled = new Date(form.scheduledAt);
      const minTime = new Date(Date.now() + 15 * 60 * 1000);
      if (scheduled < minTime) {
        newErrors.scheduledAt = "Scheduled time must be at least 15 minutes from now";
      }
      const maxTime = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
      if (scheduled > maxTime) {
        newErrors.scheduledAt = "Cannot schedule more than 90 days ahead";
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePreview = async () => {
    if (!form.targetRole || form.targetSchools.length === 0) {
      toast.error("Select target role and at least one school");
      return;
    }
    setPreviewLoading(true);
    try {
      const result = await previewRecipientsAction(
        form.targetRole as TargetRole,
        form.targetSchools
      );
      setPreview(result);
    } catch {
      toast.error("Failed to preview recipients");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!validate()) {return;}
    setLoading(true);
    try {
      const result = await sendSuperAdminNotification({
        title: form.title.trim(),
        body: form.body.trim(),
        priority: form.priority,
        category: form.category || undefined,
        targetRole: form.targetRole,
        targetSchools: form.targetSchools,
        isPinned: form.isPinned,
        hasRating: form.hasRating,
        sendNow: form.sendNow,
        scheduledAt: form.sendNow ? undefined : form.scheduledAt,
      });

      if (result.success) {
        toast.success(form.sendNow
          ? `Notification sent to ${result.recipientCount} recipients`
          : "Notification scheduled successfully");
        // Reset form
        setForm({
          title: "",
          body: "",
          priority: "normal",
          category: "",
          targetRole: "principal",
          targetSchools: [],
          isPinned: false,
          hasRating: false,
          sendNow: true,
          scheduledAt: "",
        });
        setPreview(null);
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Failed to send notification");
    } finally {
      setLoading(false);
    }
  };

  const toggleSchool = (schoolId: string) => {
    setForm((prev) => ({
      ...prev,
      targetSchools: prev.targetSchools.includes(schoolId)
        ? prev.targetSchools.filter((id) => id !== schoolId)
        : [...prev.targetSchools, schoolId],
    }));
    setPreview(null);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Compose Form */}
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Compose Notification</CardTitle>
            <CardDescription>
              Send notifications to principals, teachers, or students across schools.
              You are sending as Super Admin.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title <span className="text-danger">*</span></Label>
              <Input
                id="title"
                placeholder="Enter notification title"
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                error={!!errors.title}
              />
              {errors.title && <p className="text-xs text-danger">{errors.title}</p>}
            </div>

            {/* Body */}
            <div className="space-y-2">
              <Label htmlFor="body">Message <span className="text-danger">*</span></Label>
              <Textarea
                id="body"
                placeholder="Enter your message (min 10 characters)"
                rows={5}
                value={form.body}
                onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))}
                error={!!errors.body}
              />
              {errors.body && <p className="text-xs text-danger">{errors.body}</p>}
              <p className="text-xs text-text-muted">
                {form.body.length}/10,000 characters
              </p>
            </div>

            {/* Priority & Category */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  id="priority"
                  value={form.priority}
                  onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))}
                >
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  id="category"
                  value={form.category}
                  onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                >
                  {CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </Select>
              </div>
            </div>

            {/* Target Role */}
            <div className="space-y-2">
              <Label>Target Role <span className="text-danger">*</span></Label>
              <div className="flex gap-3">
                {TARGET_ROLE_OPTIONS.map((opt) => (
                  <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="targetRole"
                      value={opt.value}
                      checked={form.targetRole === opt.value}
                      onChange={(e) => {
                        setForm((p) => ({ ...p, targetRole: e.target.value }));
                        setPreview(null);
                      }}
                      className="h-4 w-4 accent-brand"
                    />
                    <span className="text-sm text-text-primary">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Target Schools */}
            <div className="space-y-2">
              <Label>Target Schools <span className="text-danger">*</span></Label>
              <div className="rounded-lg border border-border bg-surface-1 p-3 max-h-48 overflow-y-auto">
                <label className="flex items-center gap-2 mb-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.targetSchools.length === schools.length && schools.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setForm((p) => ({ ...p, targetSchools: schools.map((s) => s.id) }));
                      } else {
                        setForm((p) => ({ ...p, targetSchools: [] }));
                      }
                      setPreview(null);
                    }}
                    className="h-4 w-4 accent-brand"
                  />
                  <span className="text-sm font-medium text-text-primary">Select All Schools</span>
                </label>
                <div className="border-t border-border mt-2 pt-2 space-y-1">
                  {schools.map((school) => (
                    <label key={school.id} className="flex items-center gap-2 cursor-pointer py-1">
                      <input
                        type="checkbox"
                        checked={form.targetSchools.includes(school.id)}
                        onChange={() => {
                          toggleSchool(school.id);
                          setPreview(null);
                        }}
                        className="h-4 w-4 accent-brand"
                      />
                      <span className="text-sm text-text-primary truncate">{school.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              {errors.targetSchools && <p className="text-xs text-danger">{errors.targetSchools}</p>}
              <p className="text-xs text-text-muted">
                {form.targetSchools.length} school{form.targetSchools.length !== 1 ? "s" : ""} selected
              </p>
            </div>

            {/* Toggles */}
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isPinned}
                  onChange={(e) => setForm((p) => ({ ...p, isPinned: e.target.checked }))}
                  className="h-4 w-4 accent-brand"
                />
                <span className="text-sm text-text-primary">Pin notification</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.hasRating}
                  onChange={(e) => setForm((p) => ({ ...p, hasRating: e.target.checked }))}
                  className="h-4 w-4 accent-brand"
                />
                <span className="text-sm text-text-primary">Request rating (1-5 stars)</span>
              </label>
            </div>

            {/* Schedule */}
            <div className="space-y-2">
              <Label>Delivery</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="delivery"
                    checked={form.sendNow}
                    onChange={() => setForm((p) => ({ ...p, sendNow: true }))}
                    className="h-4 w-4 accent-brand"
                  />
                  <span className="text-sm text-text-primary">Send Now</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="delivery"
                    checked={!form.sendNow}
                    onChange={() => setForm((p) => ({ ...p, sendNow: false }))}
                    className="h-4 w-4 accent-brand"
                  />
                  <span className="text-sm text-text-primary">Schedule</span>
                </label>
              </div>
              {!form.sendNow && (
                <div className="mt-2">
                  <Input
                    type="datetime-local"
                    value={form.scheduledAt}
                    onChange={(e) => setForm((p) => ({ ...p, scheduledAt: e.target.value }))}
                    error={!!errors.scheduledAt}
                    min={new Date(Date.now() + 15 * 60 * 1000).toISOString().slice(0, 16)}
                  />
                  {errors.scheduledAt && <p className="text-xs text-danger mt-1">{errors.scheduledAt}</p>}
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="gap-2">
            <Button onClick={handlePreview} variant="outline" loading={previewLoading} disabled={form.targetSchools.length === 0}>
              <Eye className="h-4 w-4" />
              Preview Recipients
            </Button>
            <Button onClick={handleSubmit} loading={loading} disabled={loading}>
              <Send className="h-4 w-4" />
              {form.sendNow ? "Send Now" : "Schedule"}
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Preview Panel */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Recipients Preview</CardTitle>
          </CardHeader>
          <CardContent>
            {!preview ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-text-muted mx-auto mb-3" />
                <p className="text-sm text-text-secondary">
                  Select schools and click "Preview Recipients" to see the recipient count.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 rounded-lg bg-surface-2">
                    <p className="text-2xl font-bold text-text-primary">{preview.totalSchools}</p>
                    <p className="text-xs text-text-secondary">Schools</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-surface-2">
                    <p className="text-2xl font-bold text-text-primary">{preview.totalRecipients}</p>
                    <p className="text-xs text-text-secondary">Recipients</p>
                  </div>
                </div>
                {preview.bySchool.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">By School</p>
                    <div className="max-h-64 overflow-y-auto space-y-1">
                      {preview.bySchool.map((s) => (
                        <div key={s.name} className="flex items-center justify-between py-1">
                          <span className="text-sm text-text-primary truncate flex-1">{s.name}</span>
                          <span className="text-sm text-text-secondary ml-2">{s.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ALL NOTIFICATIONS TAB
// ─────────────────────────────────────────────────────────────────────────────

function AllNotificationsTab() {
  const [notifications, setNotifications] = React.useState<NotificationRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [filters, setFilters] = React.useState<NotificationFilters>({});
  const [searchInput, setSearchInput] = React.useState("");
  const [selectedNotif, setSelectedNotif] = React.useState<NotificationRow | null>(null);
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);
  const pageSize = 20;

  const fetchNotifications = React.useCallback(async () => {
    setLoading(true);
    try {
      const result = await getSuperAdminNotifications(filters, page, pageSize);
      setNotifications(result.data);
      setTotal(result.total);
    } catch {
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  React.useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleSearch = () => {
    setFilters((prev) => ({ ...prev, search: searchInput }));
    setPage(1);
  };

  const handleFilterChange = (key: keyof NotificationFilters, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value === "all" ? undefined : value,
    }));
    setPage(1);
  };

  const handleAction = async (notificationId: string, action: "pause" | "resume" | "cancel" | "send") => {
    setActionLoading(notificationId);
    try {
      const notif = notifications.find((n) => n.id === notificationId);
      if (!notif) {return;}

      if (action === "send" && (notif.status === NotificationStatus.PAUSED || notif.status === NotificationStatus.SCHEDULED)) {
        const result = await sendSuperAdminNotification({
          title: notif.title,
          body: notif.body,
          priority: notif.priority,
          category: notif.category ?? undefined,
          targetRole: notif.target_role,
          targetSchools: notif.target_schools,
          sendNow: true,
        });
        if (result.success) {
          toast.success("Notification sent successfully");
          fetchNotifications();
        } else {
          toast.error(result.error);
        }
        setActionLoading(null);
        return;
      }

      const result = await transitionNotificationStatus(notificationId, notif.version, action);
      if (result.success) {
        toast.success(`Notification ${action}ed successfully`);
        fetchNotifications();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error(`Failed to ${action} notification`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRetry = async (notificationId: string) => {
    setActionLoading(notificationId);
    try {
      const result = await retryFailedNotification(notificationId);
      if (result.success) {
        toast.success(`Retrying ${result.retriedCount} failed deliveries`);
        fetchNotifications();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Failed to retry notification");
    } finally {
      setActionLoading(null);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex-1 flex gap-2">
              <Input
                placeholder="Search notifications..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="flex-1"
              />
              <Button variant="outline" onClick={handleSearch}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Select
                value={filters.status ?? "all"}
                onChange={(e) => handleFilterChange("status", e.target.value)}
              >
                {STATUS_FILTER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </Select>
              <Select
                value={filters.targetRole ?? "all"}
                onChange={(e) => handleFilterChange("targetRole", e.target.value)}
              >
                <option value="all">All Roles</option>
                {TARGET_ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </Select>
              <Select
                value={filters.priority ?? "all"}
                onChange={(e) => handleFilterChange("priority", e.target.value)}
              >
                {PRIORITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </Select>
              <Select
                value={filters.category ?? "all"}
                onChange={(e) => handleFilterChange("category", e.target.value)}
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      {loading ? (
        <SkeletonTable rows={10} />
      ) : notifications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Bell className="h-12 w-12 text-text-muted mx-auto mb-3" />
            <p className="text-text-secondary">No notifications found</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Delivered</TableHead>
                  <TableHead>Read</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notifications.map((notif) => (
                  <TableRow key={notif.id}>
                    <TableCell>
                      <div className="max-w-xs">
                        <p className="font-medium text-text-primary truncate">{notif.title}</p>
                        <div className="flex gap-1 mt-1">
                          <PriorityBadge priority={notif.priority} />
                          {notif.is_pinned && <Badge variant="outline">Pinned</Badge>}
                          {notif.has_rating && <Badge variant="info"><Star className="h-3 w-3" /></Badge>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={notif.status} />
                    </TableCell>
                    <TableCell>
                      <span className="capitalize text-text-secondary">{notif.target_role}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-text-primary">{notif.delivered_count}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-text-primary">{notif.read_count}</span>
                        {notif.delivered_count > 0 && (
                          <span className="text-xs text-text-muted">
                            ({Math.round((notif.read_count / notif.delivered_count) * 100)}%)
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-text-secondary">
                        {notif.sent_at
                          ? new Date(notif.sent_at).toLocaleDateString("en-IN")
                          : notif.scheduled_at
                          ? new Date(notif.scheduled_at).toLocaleDateString("en-IN")
                          : new Date(notif.created_at).toLocaleDateString("en-IN")}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedNotif(notif)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {(notif.status === NotificationStatus.SCHEDULED || notif.status === NotificationStatus.PAUSED) && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleAction(notif.id, notif.status === NotificationStatus.SCHEDULED ? "pause" : "resume")}
                              loading={actionLoading === notif.id}
                            >
                              {notif.status === NotificationStatus.SCHEDULED
                                ? <Pause className="h-4 w-4" />
                                : <Play className="h-4 w-4" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleAction(notif.id, "send")}
                              loading={actionLoading === notif.id}
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleAction(notif.id, "cancel")}
                              loading={actionLoading === notif.id}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {(notif.status === NotificationStatus.FAILED || notif.status === NotificationStatus.PARTIALLY_FAILED) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRetry(notif.id)}
                            loading={actionLoading === notif.id}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-text-secondary">
                Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-text-primary px-2">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Detail Dialog */}
      {selectedNotif && (
        <Dialog open={!!selectedNotif} onOpenChange={() => setSelectedNotif(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedNotif.title}</DialogTitle>
              <DialogDescription>
                Sent on {selectedNotif.sent_at
                  ? new Date(selectedNotif.sent_at).toLocaleDateString("en-IN", {
                      day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
                    })
                  : selectedNotif.scheduled_at
                  ? `Scheduled for ${new Date(selectedNotif.scheduled_at).toLocaleDateString("en-IN", {
                      day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
                    })}`
                  : "Not sent"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              <div className="flex gap-2 flex-wrap">
                <StatusBadge status={selectedNotif.status} />
                <PriorityBadge priority={selectedNotif.priority} />
                {selectedNotif.category && (
                  <Badge variant="outline" className="capitalize">{selectedNotif.category}</Badge>
                )}
              </div>
              <div className="prose prose-sm prose-invert max-w-none">
                <p className="text-text-primary whitespace-pre-wrap">{selectedNotif.body}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                <div>
                  <p className="text-xs text-text-muted uppercase tracking-wide">Target</p>
                  <p className="text-sm text-text-primary capitalize">{selectedNotif.target_role}</p>
                </div>
                <div>
                  <p className="text-xs text-text-muted uppercase tracking-wide">Schools</p>
                  <p className="text-sm text-text-primary">{selectedNotif.target_schools.length}</p>
                </div>
                <div>
                  <p className="text-xs text-text-muted uppercase tracking-wide">Delivered</p>
                  <p className="text-sm text-text-primary">{selectedNotif.delivered_count}</p>
                </div>
                <div>
                  <p className="text-xs text-text-muted uppercase tracking-wide">Read</p>
                  <p className="text-sm text-text-primary">
                    {selectedNotif.read_count}
                    {selectedNotif.delivered_count > 0 && (
                      <span className="text-text-muted ml-1">
                        ({Math.round((selectedNotif.read_count / selectedNotif.delivered_count) * 100)}%)
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATES TAB
// ─────────────────────────────────────────────────────────────────────────────

function TemplatesTab() {
  const [templates, setTemplates] = React.useState<TemplateRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingTemplate, setEditingTemplate] = React.useState<TemplateRow | null>(null);
  const [form, setForm] = React.useState({ title: "", body: "", priority: "normal", category: "", hasRating: false });
  const [saving, setSaving] = React.useState(false);
  const [deleteConfirm, setDeleteConfirm] = React.useState<string | null>(null);

  const fetchTemplates = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await getTemplates();
      setTemplates(data);
    } catch {
      toast.error("Failed to load templates");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const openCreate = () => {
    setEditingTemplate(null);
    setForm({ title: "", body: "", priority: "normal", category: "", hasRating: false });
    setDialogOpen(true);
  };

  const openEdit = (template: TemplateRow) => {
    setEditingTemplate(template);
    setForm({
      title: template.title,
      body: template.body,
      priority: template.priority,
      category: template.category ?? "",
      hasRating: template.has_rating,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || form.body.trim().length < 10) {
      toast.error("Title and body (min 10 chars) are required");
      return;
    }
    setSaving(true);
    try {
      if (editingTemplate) {
        const result = await updateTemplate(editingTemplate.id, {
          title: form.title,
          body: form.body,
          priority: form.priority,
          category: form.category || undefined,
          hasRating: form.hasRating,
        });
        if (result.success) {
          toast.success("Template updated");
          setDialogOpen(false);
          fetchTemplates();
        } else {
          toast.error(result.error);
        }
      } else {
        const result = await createTemplate({
          title: form.title,
          body: form.body,
          priority: form.priority,
          category: form.category || undefined,
          hasRating: form.hasRating,
        });
        if (result.success) {
          toast.success("Template created");
          setDialogOpen(false);
          fetchTemplates();
        } else {
          toast.error(result.error);
        }
      }
    } catch {
      toast.error("Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (templateId: string) => {
    try {
      const result = await deleteTemplate(templateId);
      if (result.success) {
        toast.success("Template deleted");
        setDeleteConfirm(null);
        fetchTemplates();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Failed to delete template");
    }
  };

  const copyTemplate = (template: TemplateRow) => {
    // Copy template content to clipboard or show toast
    navigator.clipboard.writeText(`Title: ${template.title}\n\n${template.body}`);
    toast.success("Template copied! Paste in the Compose tab.");
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Notification Templates</h2>
          <p className="text-sm text-text-secondary">Reusable templates for common notifications</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          New Template
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 text-text-muted mx-auto mb-3" />
            <p className="text-text-secondary">No templates yet</p>
            <p className="text-sm text-text-muted mt-1">Create templates for quick notification sending</p>
            <Button onClick={openCreate} className="mt-4">
              <Plus className="h-4 w-4" />
              Create Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{template.title}</CardTitle>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(template)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm(template.id)}>
                      <Trash2 className="h-4 w-4 text-danger" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-text-secondary line-clamp-3 mb-3">{template.body}</p>
                <div className="flex gap-1 flex-wrap">
                  <PriorityBadge priority={template.priority} />
                  {template.category && <Badge variant="outline" className="capitalize">{template.category}</Badge>}
                  {template.has_rating && <Badge variant="info"><Star className="h-3 w-3" /></Badge>}
                </div>
              </CardContent>
              <CardFooter className="pt-2 border-t border-border justify-between">
                <span className="text-xs text-text-muted">Used {template.use_count} times</span>
                <Button variant="ghost" size="sm" onClick={() => copyTemplate(template)}>
                  <Copy className="h-3 w-3" />
                  Use
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      {dialogOpen && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingTemplate ? "Edit Template" : "New Template"}</DialogTitle>
              <DialogDescription>
                Create a reusable notification template.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Template title"
                />
              </div>
              <div className="space-y-2">
                <Label>Body</Label>
                <Textarea
                  value={form.body}
                  onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))}
                  placeholder="Template body (min 10 characters)"
                  rows={4}
                />
              </div>
              <div className="grid gap-4 grid-cols-2">
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select
                    value={form.priority}
                    onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))}
                  >
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={form.category}
                    onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                  >
                    <option value="">None</option>
                    {CATEGORY_OPTIONS.filter((c) => c.value).map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </Select>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.hasRating}
                  onChange={(e) => setForm((p) => ({ ...p, hasRating: e.target.checked }))}
                  className="h-4 w-4 accent-brand"
                />
                <span className="text-sm text-text-primary">Request rating</span>
              </label>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} loading={saving}>{editingTemplate ? "Update" : "Create"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Delete Template?</DialogTitle>
              <DialogDescription>This action cannot be undone.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
              <Button variant="destructive" onClick={() => handleDelete(deleteConfirm)}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FEEDBACK INTELLIGENCE TAB
// ─────────────────────────────────────────────────────────────────────────────

function FeedbackIntelligenceTab() {
  const [feedback, setFeedback] = React.useState<FeedbackRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [weeklySummary, setWeeklySummary] = React.useState<Awaited<ReturnType<typeof getWeeklyFeedbackSummary>> | null>(null);
  const [schoolEngagement, setSchoolEngagement] = React.useState<Awaited<ReturnType<typeof getSchoolEngagementScores>>>([]);
  const [selectedFeedback, setSelectedFeedback] = React.useState<FeedbackRow | null>(null);
  const pageSize = 20;

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [feedbackResult, weekly, engagement] = await Promise.all([
        getSuperAdminFeedback(page, pageSize),
        getWeeklyFeedbackSummary(),
        getSchoolEngagementScores(),
      ]);
      setFeedback(feedbackResult.data);
      setTotal(feedbackResult.total);
      setWeeklySummary(weekly);
      setSchoolEngagement(engagement);
    } catch {
      toast.error("Failed to load feedback");
    } finally {
      setLoading(false);
    }
  }, [page]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      {/* Weekly Summary Cards */}
      {weeklySummary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Feedback This Week"
            value={weeklySummary.thisWeek}
            icon={MessageSquare}
            trend={weeklySummary.percentChange > 0 ? "up" : weeklySummary.percentChange < 0 ? "down" : "neutral"}
            trendValue={`${Math.abs(weeklySummary.percentChange)}% vs last week`}
          />
          <StatCard
            label="Avg Rating (This Week)"
            value={weeklySummary.avgRatingThisWeek || "N/A"}
            icon={Star}
          />
          <StatCard
            label="Avg Rating (Last Week)"
            value={weeklySummary.avgRatingLastWeek || "N/A"}
            icon={Star}
          />
          <Card>
            <div className="pt-1">
              <p className="text-sm text-text-secondary">Top Tags</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {weeklySummary.topTags.slice(0, 3).map((t) => (
                  <Badge key={t.tag} variant="outline" className="text-xs">
                    {FEEDBACK_TAG_LABELS[t.tag] ?? t.tag}: {t.count}
                  </Badge>
                ))}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* School Engagement Table */}
      {schoolEngagement.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>School Engagement Score</CardTitle>
            <CardDescription>Schools ranked by feedback activity and rating</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>School</TableHead>
                  <TableHead>Feedback Count</TableHead>
                  <TableHead>Engagement Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schoolEngagement.slice(0, 10).map((school) => (
                  <TableRow key={school.school_id}>
                    <TableCell className="font-medium text-text-primary">{school.school_name}</TableCell>
                    <TableCell>{school.feedback_count}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 rounded-full bg-surface-2 overflow-hidden">
                          <div
                            className="h-full bg-brand rounded-full"
                            style={{ width: `${Math.min(100, (school.score / 50) * 100)}%` }}
                          />
                        </div>
                        <span className="text-sm text-text-primary">{school.score}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Feedback List */}
      <Card>
        <CardHeader>
          <CardTitle>Feedback Received</CardTitle>
          <CardDescription>Feedback from principals and teachers on your notifications</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <SkeletonTable rows={5} />
          ) : feedback.length === 0 ? (
            <div className="py-12 text-center">
              <MessageSquare className="h-12 w-12 text-text-muted mx-auto mb-3" />
              <p className="text-text-secondary">No feedback received yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {feedback.map((item) => {
                const tags = classifyFeedback(item.feedback_text);
                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-lg border border-border bg-surface-1 hover:bg-surface-2/50 transition-colors cursor-pointer"
                    onClick={() => setSelectedFeedback(item)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-text-primary">
                            {item.is_anonymous ? "Anonymous" : item.sender_name ?? item.school_name ?? "Unknown"}
                          </span>
                          {item.notification_title && (
                            <Badge variant="outline" className="text-xs">
                              Re: {item.notification_title}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-text-secondary line-clamp-2">{item.feedback_text}</p>
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {tags.map((tag) => (
                            <span
                              key={tag}
                              className={cn(
                                "text-xs px-2 py-0.5 rounded-full border",
                                FEEDBACK_TAG_COLORS[tag] ?? FEEDBACK_TAG_COLORS.general
                              )}
                            >
                              {FEEDBACK_TAG_LABELS[tag] ?? tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        {item.rating && <RatingStars value={item.rating} />}
                        <span className="text-xs text-text-muted">
                          {new Date(item.created_at).toLocaleDateString("en-IN")}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-text-secondary">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Feedback Detail Dialog */}
      {selectedFeedback && (
        <Dialog open={!!selectedFeedback} onOpenChange={() => setSelectedFeedback(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {selectedFeedback.is_anonymous ? "Anonymous Feedback" : selectedFeedback.sender_name ?? selectedFeedback.school_name ?? "Feedback"}
              </DialogTitle>
              <DialogDescription>
                {selectedFeedback.notification_title && `Re: ${selectedFeedback.notification_title}`} &bull;{" "}
                {new Date(selectedFeedback.created_at).toLocaleDateString("en-IN", {
                  day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
                })}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {selectedFeedback.rating && (
                <div className="flex items-center gap-2">
                  <RatingStars value={selectedFeedback.rating} />
                </div>
              )}
              <div className="p-4 rounded-lg bg-surface-2">
                <p className="text-text-primary whitespace-pre-wrap">{selectedFeedback.feedback_text}</p>
              </div>
              <div className="flex gap-1 flex-wrap">
                {classifyFeedback(selectedFeedback.feedback_text).map((tag) => (
                  <span
                    key={tag}
                    className={cn(
                      "text-xs px-2 py-0.5 rounded-full border",
                      FEEDBACK_TAG_COLORS[tag] ?? FEEDBACK_TAG_COLORS.general
                    )}
                  >
                    {FEEDBACK_TAG_LABELS[tag] ?? tag}
                  </span>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ANALYTICS TAB
// ─────────────────────────────────────────────────────────────────────────────

function AnalyticsTab() {
  const [summary, setSummary] = React.useState<AnalyticsSummary | null>(null);
  const [ratingDist, setRatingDist] = React.useState<Record<number, number>>({});
  const [feedbackTrends, setFeedbackTrends] = React.useState<{ date: string; count: number; avgRating: number }[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dateRange, setDateRange] = React.useState<{ from: string; to: string }>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] ?? '',
    to: new Date().toISOString().split("T")[0] ?? '',
  });

  const fetchAnalytics = React.useCallback(async () => {
    setLoading(true);
    try {
      const [summaryData, ratingData, trendsData] = await Promise.all([
        getAnalyticsSummary(dateRange.from, dateRange.to),
        getRatingDistribution(),
        getFeedbackTrends(30),
      ]);
      setSummary(summaryData);
      setRatingDist(ratingData);
      setFeedbackTrends(trendsData);
    } catch {
      toast.error("Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  React.useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const maxRatingCount = Math.max(...Object.values(ratingDist), 1);
  const maxTrendCount = Math.max(...feedbackTrends.map((t) => t.count), 1);

  return (
    <div className="space-y-6">
      {/* Date Range Filter */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col gap-4 sm:flex-row items-end">
            <div className="space-y-2">
              <Label htmlFor="dateFrom">From</Label>
              <Input
                id="dateFrom"
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange((p) => ({ ...p, from: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateTo">To</Label>
              <Input
                id="dateTo"
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange((p) => ({ ...p, to: e.target.value }))}
              />
            </div>
            <Button onClick={fetchAnalytics} variant="outline">
              Apply
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : summary ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Sent"
            value={summary.totalSent}
            icon={Send}
          />
          <StatCard
            label="Total Delivered"
            value={summary.totalDelivered}
            icon={CheckCircle}
          />
          <StatCard
            label="Average Read Rate"
            value={`${summary.avgReadRate}%`}
            icon={Eye}
          />
          <StatCard
            label="Average Rating"
            value={summary.avgRating > 0 ? summary.avgRating.toFixed(1) : "N/A"}
            icon={Star}
          />
          <StatCard
            label="Total Ratings"
            value={summary.totalRatings}
            icon={Star}
          />
          <StatCard
            label="Failure Rate"
            value={`${summary.failureRate}%`}
            icon={AlertTriangle}
          />
          <StatCard
            label="Total Read"
            value={summary.totalRead}
            icon={Eye}
          />
        </div>
      ) : null}

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Rating Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Rating Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <div className="space-y-3">
                {[5, 4, 3, 2, 1].map((rating) => {
                  const count = ratingDist[rating] ?? 0;
                  const percentage = maxRatingCount > 0 ? (count / maxRatingCount) * 100 : 0;
                  return (
                    <div key={rating} className="flex items-center gap-3">
                      <div className="flex items-center gap-1 w-16">
                        <span className="text-sm text-text-secondary">{rating}</span>
                        <Star className="h-3 w-3 fill-warning text-warning" />
                      </div>
                      <div className="flex-1 h-4 rounded-full bg-surface-2 overflow-hidden">
                        <div
                          className="h-full bg-warning rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-sm text-text-secondary w-8 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Feedback Volume Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Feedback Volume (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-48 w-full" />
            ) : feedbackTrends.length === 0 ? (
              <div className="h-48 flex items-center justify-center">
                <p className="text-text-muted">No feedback data available</p>
              </div>
            ) : (
              <div className="h-48 flex items-end gap-1">
                {feedbackTrends.map((day) => {
                  const height = maxTrendCount > 0 ? (day.count / maxTrendCount) * 100 : 0;
                  return (
                    <div
                      key={day.date}
                      className="flex-1 group relative"
                    >
                      <div
                        className="bg-brand rounded-t transition-all duration-300 hover:bg-brand/80"
                        style={{ height: `${Math.max(2, height)}%` }}
                      />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-surface-2 text-xs text-text-primary px-2 py-1 rounded whitespace-nowrap z-10">
                        {day.date}: {day.count} feedback
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Key Performance Indicators</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="p-4 rounded-lg bg-surface-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-text-secondary">Read Rate</span>
                <span className="text-2xl font-bold text-text-primary">
                  {summary?.avgReadRate ?? 0}%
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-surface-3 overflow-hidden">
                <div
                  className="h-full bg-success rounded-full"
                  style={{ width: `${summary?.avgReadRate ?? 0}%` }}
                />
              </div>
            </div>
            <div className="p-4 rounded-lg bg-surface-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-text-secondary">Rating Score</span>
                <div className="flex items-center gap-1">
                  <span className="text-2xl font-bold text-text-primary">
                    {summary?.avgRating ?? 0}
                  </span>
                  <Star className="h-5 w-5 fill-warning text-warning" />
                </div>
              </div>
              <div className="w-full h-2 rounded-full bg-surface-3 overflow-hidden">
                <div
                  className="h-full bg-warning rounded-full"
                  style={{ width: `${((summary?.avgRating ?? 0) / 5) * 100}%` }}
                />
              </div>
            </div>
            <div className="p-4 rounded-lg bg-surface-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-text-secondary">Delivery Rate</span>
                <span className="text-2xl font-bold text-text-primary">
                  {summary && summary.totalSent > 0
                    ? Math.round((summary.totalDelivered / summary.totalSent) * 100)
                    : 0}%
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-surface-3 overflow-hidden">
                <div
                  className="h-full bg-info rounded-full"
                  style={{
                    width: `${summary && summary.totalSent > 0
                      ? (summary.totalDelivered / summary.totalSent) * 100
                      : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function CommunicatePage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Communicate</h1>
        <p className="text-sm text-text-secondary mt-1">
          Send notifications, manage templates, and analyze feedback
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="compose">
        <TabsList className="w-full overflow-x-auto flex-nowrap">
          <TabsTrigger value="compose">
            <Send className="h-4 w-4 mr-2" />
            Compose
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-2" />
            All Notifications
          </TabsTrigger>
          <TabsTrigger value="templates">
            <FileText className="h-4 w-4 mr-2" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="feedback">
            <MessageSquare className="h-4 w-4 mr-2" />
            Feedback
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="compose">
          <ComposeTab />
        </TabsContent>
        <TabsContent value="notifications">
          <AllNotificationsTab />
        </TabsContent>
        <TabsContent value="templates">
          <TemplatesTab />
        </TabsContent>
        <TabsContent value="feedback">
          <FeedbackIntelligenceTab />
        </TabsContent>
        <TabsContent value="analytics">
          <AnalyticsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
