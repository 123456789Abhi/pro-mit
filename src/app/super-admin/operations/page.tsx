"use client";

import { useState, useEffect, useCallback } from "react";
import { formatDateIST, formatRelativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  AlertTriangle,
  AlertCircle,
  AlertOctagon,
  Info,
  Shield,
  Eye,

  Clock,
  Activity,
  Users,
  Server,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Download,
  ChevronDown,

  Search,
  Filter,

  Plus,
  Edit,

  Key,
  FileText,
  Play,

  Bug,
  Zap,
  Database,
  Cloud,
  Bot,
  Globe,
  Lock,
  UserCog,
  TrendingUp,
  Bell,


} from "lucide-react";
import type {
  AdminAlert,
  AlertSeverity,
  AlertType,
  ImpersonationSession,
  AuditLogEntry,
  AdminAccount,
  AdminRole,
  SystemHealthStatus,
  BackgroundJob,
} from "@/lib/actions/super-admin/operations";

// ═══════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════

type TabId = "alerts" | "impersonation" | "audit" | "admins" | "health";

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

// ═══════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════

const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  ai_api_down: "AI API Down",
  database_unavailable: "Database Unavailable",
  payment_failed: "Payment Failed",
  security_breach: "Security Breach",
  budget_exhausted: "Budget Exhausted",
  suspicious_access: "Suspicious Access",
  new_admin_created: "New Admin Created",
  ai_cost_spike: "AI Cost Spike",
  cache_hit_rate_drop: "Cache Hit Rate Drop",
  high_error_rate: "High Error Rate",
  notification_failure_rate: "Notification Failure Rate",
  content_processing_failed: "Content Processing Failed",
  bulk_data_export: "Bulk Data Export",
  school_expired: "School Expired",
  bulk_data_anomaly: "Bulk Data Anomaly",
  budget_warning: "Budget Warning",
  low_engagement: "Low Engagement",
  low_content_coverage: "Low Content Coverage",
  slow_ai_response: "Slow AI Response",
  teacher_not_active: "Teacher Not Active",
  teacher_low_adoption: "Teacher Low Adoption",
  quiz_failure: "Quiz Failure",
  pregen_coverage_gap: "Pre-gen Coverage Gap",
  impersonation_session_open: "Impersonation Session Open",
  content_processing_stalled: "Content Processing Stalled",
  zero_ai_activity: "Zero AI Activity",
  student_risk_spike: "Student Risk Spike",
  pregen_coverage_drop: "Pre-gen Coverage Drop",
  trial_expiring_soon: "Trial Expiring Soon",
  new_school_onboarded: "New School Onboarded",
  content_added: "Content Added",
  monthly_report_ready: "Monthly Report Ready",
  unused_template: "Unused Template",
  notification_quality_drop: "Notification Quality Drop",
};

const SEVERITY_COLORS: Record<AlertSeverity, { bg: string; text: string; border: string; icon: React.ReactNode }> = {
  critical: {
    bg: "bg-danger/10",
    text: "text-danger",
    border: "border-danger/30",
    icon: <AlertOctagon className="h-4 w-4" />,
  },
  high: {
    bg: "bg-warning/10",
    text: "text-warning",
    border: "border-warning/30",
    icon: <AlertTriangle className="h-4 w-4" />,
  },
  medium: {
    bg: "bg-yellow-500/10",
    text: "text-yellow-500",
    border: "border-yellow-500/30",
    icon: <AlertCircle className="h-4 w-4" />,
  },
  low: {
    bg: "bg-info/10",
    text: "text-info",
    border: "border-info/30",
    icon: <Info className="h-4 w-4" />,
  },
};

const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: "Super Admin",
  support_admin: "Support Admin",
  viewer: "Viewer",
};

const ADMIN_ROLE_COLORS: Record<AdminRole, { bg: string; text: string }> = {
  super_admin: { bg: "bg-danger/10", text: "text-danger" },
  support_admin: { bg: "bg-warning/10", text: "text-warning" },
  viewer: { bg: "bg-info/10", text: "text-info" },
};

const HEALTH_STATUS_COLORS: Record<SystemHealthStatus["status"], { bg: string; text: string; icon: React.ReactNode }> = {
  healthy: { bg: "bg-success/10", text: "text-success", icon: <CheckCircle2 className="h-4 w-4" /> },
  degraded: { bg: "bg-warning/10", text: "text-warning", icon: <AlertTriangle className="h-4 w-4" /> },
  down: { bg: "bg-danger/10", text: "text-danger", icon: <XCircle className="h-4 w-4" /> },
};

const JOB_STATUS_COLORS: Record<BackgroundJob["status"], { bg: string; text: string }> = {
  running: { bg: "bg-info/10", text: "text-info" },
  completed: { bg: "bg-success/10", text: "text-success" },
  failed: { bg: "bg-danger/10", text: "text-danger" },
  scheduled: { bg: "bg-warning/10", text: "text-warning" },
};

// ═══════════════════════════════════════════════════════
// TABS CONFIGURATION
// ═══════════════════════════════════════════════════════

const TABS: Tab[] = [
  { id: "alerts", label: "System Alerts", icon: <Bell className="h-4 w-4" /> },
  { id: "impersonation", label: "Impersonation Log", icon: <Eye className="h-4 w-4" /> },
  { id: "audit", label: "Activity Audit Log", icon: <FileText className="h-4 w-4" /> },
  { id: "admins", label: "Admin Accounts", icon: <Users className="h-4 w-4" /> },
  { id: "health", label: "System Health", icon: <Server className="h-4 w-4" /> },
];

// ═══════════════════════════════════════════════════════
// MOCK DATA
// ═══════════════════════════════════════════════════════

function getMockAlerts(): AdminAlert[] {
  return [
    {
      id: "1",
      type: "ai_api_down",
      severity: "critical",
      title: "Gemini API Response Time Exceeded",
      description: "Gemini API is responding with >10s latency. Affecting 234 student queries.",
      created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      resolved_at: null,
      resolved_by: null,
      resolution_note: null,
      metadata: { affected_queries: 234, avg_latency_ms: 12500 },
    },
    {
      id: "2",
      type: "budget_warning",
      severity: "medium",
      title: "Monthly AI Budget at 80%",
      description: "Gemini budget: ₹45,000/₹50,000 consumed this month.",
      created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      resolved_at: null,
      resolved_by: null,
      resolution_note: null,
      metadata: { budget: 50000, spent: 45000 },
    },
    {
      id: "3",
      type: "high_error_rate",
      severity: "high",
      title: "Quiz Generation Error Rate Spike",
      description: "Quiz failure rate increased to 15% (threshold: 5%).",
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      resolved_at: null,
      resolved_by: null,
      resolution_note: null,
      metadata: { error_rate: 0.15, threshold: 0.05 },
    },
    {
      id: "4",
      type: "suspicious_access",
      severity: "critical",
      title: "Multiple Failed Login Attempts",
      description: "IP 192.168.1.1 attempted 15 failed logins in 5 minutes.",
      created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      resolved_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      resolved_by: "admin-1",
      resolution_note: "IP blocked, user account locked",
      metadata: { ip: "192.168.1.1", attempts: 15 },
    },
    {
      id: "5",
      type: "teacher_not_active",
      severity: "medium",
      title: "Teacher Inactive for 7 Days",
      description: "Priya Sharma (Class 9-A Science) has not logged in for 7 days.",
      created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      resolved_at: null,
      resolved_by: null,
      resolution_note: null,
      metadata: { teacher_id: "teacher-1", days_inactive: 7 },
    },
    {
      id: "6",
      type: "pregen_coverage_gap",
      severity: "medium",
      title: "Pre-generated Content Coverage Low",
      description: "Class 10 Mathematics has only 45% pre-gen coverage. Target: 80%.",
      created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      resolved_at: null,
      resolved_by: null,
      resolution_note: null,
      metadata: { class_id: "class-10-math", coverage: 0.45, target: 0.8 },
    },
    {
      id: "7",
      type: "content_processing_stalled",
      severity: "high",
      title: "Content Processing Queue Stuck",
      description: "125 items stuck in processing queue for >1 hour.",
      created_at: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
      resolved_at: null,
      resolved_by: null,
      resolution_note: null,
      metadata: { queue_size: 125, stuck_time_minutes: 65 },
    },
    {
      id: "8",
      type: "new_admin_created",
      severity: "low",
      title: "New Admin Account Created",
      description: "New support admin 'Rahul Kumar' created by Super Admin.",
      created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      resolved_at: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString(),
      resolved_by: "admin-1",
      resolution_note: "Verified - onboarding completed",
      metadata: { admin_name: "Rahul Kumar", created_by: "admin-1" },
    },
    {
      id: "9",
      type: "school_expired",
      severity: "high",
      title: "School Subscription Expired",
      description: "Delhi Public School subscription expired 2 days ago.",
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      resolved_at: null,
      resolved_by: null,
      resolution_note: null,
      metadata: { school_id: "school-5", days_expired: 2 },
    },
    {
      id: "10",
      type: "low_engagement",
      severity: "medium",
      title: "Low Student Engagement",
      description: "Class 8 students averaging only 2 questions/day (target: 10).",
      created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      resolved_at: null,
      resolved_by: null,
      resolution_note: null,
      metadata: { class_id: "class-8", avg_questions: 2, target: 10 },
    },
  ];
}

function getMockImpersonationSessions(): ImpersonationSession[] {
  return [
    {
      id: "1",
      admin_id: "admin-1",
      admin_name: "Abhishek Kumar",
      admin_email: "abhi@lernen.com",
      target_school_id: "school-1",
      target_school_name: "Oakridge International School",
      target_user_id: "principal-1",
      target_user_name: "Ramaprashad Bhattacharya",
      target_user_role: "principal",
      started_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      ended_at: null,
      ip_address: "192.168.1.100",
      actions_performed: [
        { timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(), action_type: "VIEW_DASHBOARD", details: { route: "/principal/dashboard" } },
        { timestamp: new Date(Date.now() - 20 * 60 * 1000).toISOString(), action_type: "VIEW_STUDENTS", details: { class: "10A", count: 45 } },
        { timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(), action_type: "EXPORT_REPORT", details: { report_type: "engagement" } },
      ],
      is_active: true,
    },
    {
      id: "2",
      admin_id: "admin-2",
      admin_name: "Sneha Patel",
      admin_email: "sneha@lernen.com",
      target_school_id: "school-2",
      target_school_name: "Delhi Public School",
      target_user_id: "teacher-5",
      target_user_name: "Meera Kapoor",
      target_user_role: "teacher",
      started_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      ended_at: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
      ip_address: "10.0.0.50",
      actions_performed: [
        { timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), action_type: "VIEW_CLASSES", details: {} },
        { timestamp: new Date(Date.now() - 110 * 60 * 1000).toISOString(), action_type: "GENERATE_QUIZ", details: { subject: "Mathematics" } },
      ],
      is_active: false,
    },
    {
      id: "3",
      admin_id: "admin-1",
      admin_name: "Abhishek Kumar",
      admin_email: "abhi@lernen.com",
      target_school_id: "school-3",
      target_school_name: "St. Mary's School",
      target_user_id: "principal-3",
      target_user_name: "Fr. George Thomas",
      target_user_role: "principal",
      started_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      ended_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000).toISOString(),
      ip_address: "192.168.1.100",
      actions_performed: [
        { timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), action_type: "TROUBLESHOOT_ISSUE", details: { issue_type: "login_problem" } },
      ],
      is_active: false,
    },
  ];
}

function getMockAuditLog(): AuditLogEntry[] {
  return [
    {
      id: "1",
      actor_id: "admin-1",
      actor_name: "Abhishek Kumar",
      actor_email: "abhi@lernen.com",
      action: "CREATE_SCHOOL",
      resource_type: "schools",
      resource_id: "school-10",
      changes: { name: "New Genesis School", board: "CBSE" },
      ip_address: "192.168.1.100",
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "2",
      actor_id: "admin-1",
      actor_name: "Abhishek Kumar",
      actor_email: "abhi@lernen.com",
      action: "UPDATE_PRICING",
      resource_type: "school_pricing",
      resource_id: "school-5",
      changes: { from: { monthly_per_student: 150 }, to: { monthly_per_student: 175 } },
      ip_address: "192.168.1.100",
      created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "3",
      actor_id: "admin-2",
      actor_name: "Sneha Patel",
      actor_email: "sneha@lernen.com",
      action: "CREATE_ADMIN",
      resource_type: "users",
      resource_id: "admin-5",
      changes: { name: "Rahul Kumar", email: "rahul@lernen.com", role: "support_admin" },
      ip_address: "10.0.0.50",
      created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "4",
      actor_id: "admin-1",
      actor_name: "Abhishek Kumar",
      actor_email: "abhi@lernen.com",
      action: "SEND_NOTIFICATION",
      resource_type: "notifications",
      resource_id: "notif-100",
      changes: { title: "Maintenance Notice", recipient_count: 5000 },
      ip_address: "192.168.1.100",
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "5",
      actor_id: "admin-3",
      actor_name: "Vikram Singh",
      actor_email: "vikram@lernen.com",
      action: "UPDATE_ADMIN_ROLE",
      resource_type: "users",
      resource_id: "admin-2",
      changes: { from_role: "viewer", to_role: "support_admin" },
      ip_address: "172.16.0.25",
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "6",
      actor_id: "admin-1",
      actor_name: "Abhishek Kumar",
      actor_email: "abhi@lernen.com",
      action: "FREEZE_SCHOOL",
      resource_type: "schools",
      resource_id: "school-8",
      changes: { reason: "Payment overdue >30 days" },
      ip_address: "192.168.1.100",
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "7",
      actor_id: "admin-1",
      actor_name: "Abhishek Kumar",
      actor_email: "abhi@lernen.com",
      action: "BULK_IMPORT",
      resource_type: "students",
      resource_id: null,
      changes: { count: 150, school_id: "school-3", file: "students_batch_2026.csv" },
      ip_address: "192.168.1.100",
      created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "8",
      actor_id: "admin-2",
      actor_name: "Sneha Patel",
      actor_email: "sneha@lernen.com",
      action: "EXPORT_DATA",
      resource_type: "audit_log",
      resource_id: null,
      changes: { format: "csv", date_range: "2026-01-01 to 2026-03-31" },
      ip_address: "10.0.0.50",
      created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];
}

function getMockAdmins(): AdminAccount[] {
  return [
    {
      id: "admin-1",
      name: "Abhishek Kumar",
      email: "abhi@lernen.com",
      role: "super_admin",
      last_login_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      is_active: true,
      created_at: "2024-01-15T10:00:00Z",
      created_by: null,
    },
    {
      id: "admin-2",
      name: "Sneha Patel",
      email: "sneha@lernen.com",
      role: "support_admin",
      last_login_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      is_active: true,
      created_at: "2024-03-20T14:30:00Z",
      created_by: "admin-1",
    },
    {
      id: "admin-3",
      name: "Vikram Singh",
      email: "vikram@lernen.com",
      role: "viewer",
      last_login_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      is_active: true,
      created_at: "2024-06-10T09:15:00Z",
      created_by: "admin-1",
    },
    {
      id: "admin-4",
      name: "Priya Sharma",
      email: "priya@lernen.com",
      role: "support_admin",
      last_login_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      is_active: true,
      created_at: "2024-08-05T11:45:00Z",
      created_by: "admin-1",
    },
    {
      id: "admin-5",
      name: "Rahul Kumar",
      email: "rahul@lernen.com",
      role: "viewer",
      last_login_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      is_active: false,
      created_at: "2025-01-20T16:00:00Z",
      created_by: "admin-2",
    },
  ];
}

function getMockSystemHealth(): SystemHealthStatus[] {
  return [
    { service: "Supabase Database", status: "healthy", response_time_ms: 23, last_check: new Date().toISOString(), error_message: null },
    { service: "Supabase Auth", status: "healthy", response_time_ms: 45, last_check: new Date().toISOString(), error_message: null },
    { service: "Supabase Storage", status: "healthy", response_time_ms: 67, last_check: new Date().toISOString(), error_message: null },
    { service: "Vercel Edge Functions", status: "healthy", response_time_ms: 120, last_check: new Date().toISOString(), error_message: null },
    { service: "Gemini API", status: "degraded", response_time_ms: 3500, last_check: new Date().toISOString(), error_message: "High latency detected" },
    { service: "Claude API", status: "healthy", response_time_ms: 890, last_check: new Date().toISOString(), error_message: null },
    { service: "OpenAI Embeddings", status: "healthy", response_time_ms: 234, last_check: new Date().toISOString(), error_message: null },
  ];
}

function getMockBackgroundJobs(): BackgroundJob[] {
  return [
    { id: "1", name: "Alert Generation", description: "Generates system alerts every 5 minutes", schedule: "*/5 * * * *", last_run: new Date(Date.now() - 3 * 60 * 1000).toISOString(), next_run: new Date(Date.now() + 2 * 60 * 1000).toISOString(), status: "completed", last_duration_seconds: 12, error_message: null },
    { id: "2", name: "Daily Metrics Computation", description: "Computes daily school metrics at midnight IST", schedule: "0 0 * * *", last_run: new Date(Date.now() - 14 * 60 * 60 * 1000).toISOString(), next_run: new Date(Date.now() + 10 * 60 * 60 * 1000).toISOString(), status: "completed", last_duration_seconds: 45, error_message: null },
    { id: "3", name: "Monthly Costs Computation", description: "Computes monthly AI costs on the 1st of each month", schedule: "0 1 1 * *", last_run: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), next_run: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(), status: "completed", last_duration_seconds: 120, error_message: null },
    { id: "4", name: "Content Pre-generation", description: "Processes content pre-generation queue continuously", schedule: "Continuous", last_run: new Date(Date.now() - 30 * 1000).toISOString(), next_run: new Date(Date.now() + 30 * 1000).toISOString(), status: "running", last_duration_seconds: null, error_message: null },
    { id: "5", name: "Scheduled Notifications", description: "Sends scheduled notifications every minute", schedule: "*/1 * * * *", last_run: new Date(Date.now() - 45 * 1000).toISOString(), next_run: new Date(Date.now() + 15 * 1000).toISOString(), status: "completed", last_duration_seconds: 3, error_message: null },
  ];
}

// ═══════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════

function StatCard({ label, value, icon, trend }: { label: string; value: string | number; icon: React.ReactNode; trend?: "up" | "down" | "neutral" }) {
  return (
    <div className="stat-card flex items-center gap-4">
      <div className="rounded-lg bg-surface-2 p-3">{icon}</div>
      <div>
        <p className="text-sm text-text-secondary">{label}</p>
        <div className="flex items-center gap-2">
          <p className="text-2xl font-semibold text-text-primary">{value}</p>
          {trend && (
            <span className={cn("text-xs", trend === "up" ? "text-success" : trend === "down" ? "text-danger" : "text-text-muted")}>
              {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function Badge({ children, variant = "default" }: { children: React.ReactNode; variant?: "default" | "success" | "warning" | "danger" | "info" }) {
  const colors = {
    default: "bg-surface-2 text-text-secondary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    danger: "bg-danger/10 text-danger",
    info: "bg-info/10 text-info",
  };

  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", colors[variant])}>{children}</span>;
}

function SeverityBadge({ severity }: { severity: AlertSeverity }) {
  const { bg, text, icon } = SEVERITY_COLORS[severity];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize", bg, text)}>
      {icon}
      {severity}
    </span>
  );
}

function EmptyState({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 rounded-full bg-surface-2 p-4 text-text-muted">{icon}</div>
      <h3 className="mb-1 text-lg font-medium text-text-primary">{title}</h3>
      <p className="text-sm text-text-secondary">{description}</p>
    </div>
  );
}


// ═══════════════════════════════════════════════════════
// TAB 1: SYSTEM ALERTS
// ═══════════════════════════════════════════════════════

function AlertsTab() {
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState<AlertSeverity | "all">("all");
  const [resolvedFilter, setResolvedFilter] = useState<"all" | "unresolved" | "resolved">("all");
  const [selectedAlert, setSelectedAlert] = useState<AdminAlert | null>(null);
  const [showResolveDialog, setShowResolveDialog] = useState(false);
  const [resolveNote, setResolveNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Load mock data
    const mockAlerts = getMockAlerts();
    setAlerts(mockAlerts);
    setLoading(false);
  }, []);

  const filteredAlerts = alerts.filter((alert) => {
    if (severityFilter !== "all" && alert.severity !== severityFilter) {return false;}
    if (resolvedFilter === "unresolved" && alert.resolved_at) {return false;}
    if (resolvedFilter === "resolved" && !alert.resolved_at) {return false;}
    return true;
  });

  const unresolvedCount = alerts.filter((a) => !a.resolved_at).length;
  const criticalCount = alerts.filter((a) => a.severity === "critical" && !a.resolved_at).length;

  const handleResolve = async () => {
    if (!selectedAlert || !resolveNote.trim()) {return;}
    setSubmitting(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500));

    setAlerts((prev) =>
      prev.map((a) =>
        a.id === selectedAlert.id
          ? { ...a, resolved_at: new Date().toISOString(), resolution_note: resolveNote }
          : a
      )
    );

    setShowResolveDialog(false);
    setSelectedAlert(null);
    setResolveNote("");
    setSubmitting(false);
    toast.success("Alert resolved successfully");
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="stat-card animate-pulse">
              <div className="h-12 w-12 rounded-lg bg-surface-2" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-20 rounded bg-surface-2" />
                <div className="h-6 w-12 rounded bg-surface-2" />
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 rounded-lg bg-surface-1 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Alerts" value={alerts.length} icon={<Bell className="h-5 w-5 text-info" />} />
        <StatCard label="Unresolved" value={unresolvedCount} icon={<AlertCircle className="h-5 w-5 text-warning" />} />
        <StatCard label="Critical" value={criticalCount} icon={<AlertOctagon className="h-5 w-5 text-danger" />} trend={criticalCount > 0 ? "up" : "neutral"} />
        <StatCard label="Resolved Today" value={alerts.filter((a) => a.resolved_at && new Date(a.resolved_at).toDateString() === new Date().toDateString()).length} icon={<CheckCircle2 className="h-5 w-5 text-success" />} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-text-muted" />
          <span className="text-sm text-text-secondary">Severity:</span>
          {(["all", "critical", "high", "medium", "low"] as const).map((sev) => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={cn(
                "btn-touch rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                severityFilter === sev ? "bg-info text-white" : "bg-surface-2 text-text-secondary hover:bg-surface-3"
              )}
            >
              {sev}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-secondary">Status:</span>
          {(["all", "unresolved", "resolved"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setResolvedFilter(status)}
              className={cn(
                "btn-touch rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                resolvedFilter === status ? "bg-info text-white" : "bg-surface-2 text-text-secondary hover:bg-surface-3"
              )}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Critical Alert Banner */}
      {criticalCount > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-danger/30 bg-danger/10 p-4">
          <AlertOctagon className="h-5 w-5 text-danger" />
          <div className="flex-1">
            <p className="font-medium text-danger">Critical Alert{criticalCount > 1 ? "s" : ""} Active</p>
            <p className="text-sm text-text-secondary">{criticalCount} critical alert{criticalCount > 1 ? "s" : ""} require{criticalCount === 1 ? "s" : ""} immediate attention</p>
          </div>
          <button className="btn-touch rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-danger/80">
            View Now
          </button>
        </div>
      )}

      {/* Alert List */}
      {filteredAlerts.length === 0 ? (
        <EmptyState icon={<Bell className="h-8 w-8" />} title="No alerts found" description="No alerts match your current filters" />
      ) : (
        <div className="space-y-3">
          {filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={cn(
                "rounded-lg border p-4 transition-colors",
                alert.resolved_at ? "border-border bg-surface-1 opacity-75" : SEVERITY_COLORS[alert.severity].border,
                !alert.resolved_at && "bg-surface-1 hover:bg-surface-2"
              )}
            >
              <div className="flex items-start gap-4">
                <div className={cn("mt-0.5 rounded-full p-1.5", SEVERITY_COLORS[alert.severity].bg)}>
                  {SEVERITY_COLORS[alert.severity].icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-medium text-text-primary">{alert.title}</h3>
                    <SeverityBadge severity={alert.severity} />
                    {alert.resolved_at ? (
                      <Badge variant="success">Resolved</Badge>
                    ) : (
                      <Badge variant="warning">Unresolved</Badge>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-text-secondary">{alert.description}</p>
                  <div className="mt-2 flex items-center gap-4 text-xs text-text-muted">
                    <span>{ALERT_TYPE_LABELS[alert.type]}</span>
                    <span>•</span>
                    <span>{formatRelativeTime(alert.created_at)}</span>
                    {alert.resolved_at && (
                      <>
                        <span>•</span>
                        <span className="text-success">Resolved {formatRelativeTime(alert.resolved_at)}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!alert.resolved_at && (
                    <button
                      onClick={() => {
                        setSelectedAlert(alert);
                        setShowResolveDialog(true);
                      }}
                      className="btn-touch rounded-lg bg-success/10 px-3 py-1.5 text-xs font-medium text-success transition-colors hover:bg-success/20"
                    >
                      Resolve
                    </button>
                  )}
                  <button className="btn-touch rounded-lg bg-surface-2 p-2 text-text-muted transition-colors hover:bg-surface-3 hover:text-text-primary">
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Resolve Dialog */}
      {showResolveDialog && selectedAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-surface-1 p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold text-text-primary">Resolve Alert</h2>
            <p className="mb-4 text-sm text-text-secondary">{selectedAlert.title}</p>
            <textarea
              value={resolveNote}
              onChange={(e) => setResolveNote(e.target.value)}
              placeholder="Enter resolution note..."
              className="min-h-[100px] w-full rounded-lg border border-border bg-surface-0 p-3 text-sm text-text-primary placeholder:text-text-muted focus:border-info focus:outline-none focus:ring-1 focus:ring-info"
            />
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowResolveDialog(false);
                  setSelectedAlert(null);
                  setResolveNote("");
                }}
                className="btn-touch rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-2"
              >
                Cancel
              </button>
              <button
                onClick={handleResolve}
                disabled={!resolveNote.trim() || submitting}
                className="btn-touch rounded-lg bg-success px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-success/80 disabled:opacity-50"
              >
                {submitting ? "Resolving..." : "Resolve Alert"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// TAB 2: IMPERSONATION LOG
// ═══════════════════════════════════════════════════════

function ImpersonationTab() {
  const [sessions, setSessions] = useState<ImpersonationSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeOnly, setActiveOnly] = useState(false);
  const [selectedSession, setSelectedSession] = useState<ImpersonationSession | null>(null);
  const [showTimeline, setShowTimeline] = useState(false);

  useEffect(() => {
    const mockSessions = getMockImpersonationSessions();
    setSessions(mockSessions);
    setLoading(false);
  }, []);

  const filteredSessions = activeOnly ? sessions.filter((s) => s.is_active) : sessions;
  const activeSessions = sessions.filter((s) => s.is_active);

  const handleEndSession = async (sessionId: string) => {
    if (!confirm("Are you sure you want to end this impersonation session?")) {return;}

    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId ? { ...s, is_active: false, ended_at: new Date().toISOString() } : s
      )
    );
    toast.success("Session ended successfully");
  };

  const getDuration = (started: string, ended: string | null) => {
    const start = new Date(started).getTime();
    const end = ended ? new Date(ended).getTime() : Date.now();
    const minutes = Math.floor((end - start) / 60000);
    if (minutes < 60) {return `${minutes}m`;}
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="stat-card animate-pulse">
              <div className="h-10 w-10 rounded-lg bg-surface-2" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-24 rounded bg-surface-2" />
                <div className="h-6 w-16 rounded bg-surface-2" />
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 rounded-lg bg-surface-1 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total Sessions" value={sessions.length} icon={<Eye className="h-5 w-5 text-info" />} />
        <StatCard label="Active Now" value={activeSessions.length} icon={<Play className="h-5 w-5 text-success" />} trend={activeSessions.length > 0 ? "up" : "neutral"} />
        <StatCard label="Avg Duration" value="45m" icon={<Clock className="h-5 w-5 text-warning" />} />
      </div>

      {/* Active Session Alert */}
      {activeSessions.length > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-warning/30 bg-warning/10 p-4">
          <Eye className="h-5 w-5 text-warning" />
          <div className="flex-1">
            <p className="font-medium text-warning">{activeSessions.length} Active Impersonation Session{activeSessions.length > 1 ? "s" : ""}</p>
            <p className="text-sm text-text-secondary">
              {activeSessions.map((s) => s.admin_name).join(", ")} viewing as {activeSessions.map((s) => s.target_user_name).join(", ")}
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={activeOnly}
            onChange={(e) => setActiveOnly(e.target.checked)}
            className="h-4 w-4 rounded border-border bg-surface-2 text-info focus:ring-info"
          />
          <span className="text-sm text-text-secondary">Show active sessions only</span>
        </label>
        <button className="ml-auto flex items-center gap-2 rounded-lg border border-border bg-surface-1 px-4 py-2 text-sm text-text-primary transition-colors hover:bg-surface-2">
          <Download className="h-4 w-4" />
          Export Log
        </button>
      </div>

      {/* Sessions Table */}
      {filteredSessions.length === 0 ? (
        <EmptyState icon={<Eye className="h-8 w-8" />} title="No sessions found" description={activeOnly ? "No active impersonation sessions" : "No impersonation sessions recorded"} />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full">
            <thead className="bg-surface-2">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-text-muted">Admin</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-text-muted">Target</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-text-muted">School</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-text-muted">Started</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-text-muted">Duration</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-text-muted">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-text-muted">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface-1">
              {filteredSessions.map((session) => (
                <tr key={session.id} className="table-row-hover">
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-text-primary">{session.admin_name}</p>
                      <p className="text-xs text-text-muted">{session.admin_email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm text-text-primary">{session.target_user_name}</p>
                      <p className="text-xs text-text-muted capitalize">{session.target_user_role}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">{session.target_school_name}</td>
                  <td className="px-4 py-3 text-sm text-text-secondary">{formatDateIST(session.started_at)}</td>
                  <td className="px-4 py-3">
                    <span className={cn("text-sm font-medium", getDuration(session.started_at, session.ended_at).includes("h") ? "text-warning" : "text-text-secondary")}>
                      {getDuration(session.started_at, session.ended_at)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {session.is_active ? (
                      <Badge variant="success">Active</Badge>
                    ) : (
                      <Badge variant="default">Ended</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedSession(session);
                          setShowTimeline(true);
                        }}
                        className="btn-touch rounded-lg p-1.5 text-text-muted transition-colors hover:bg-surface-2 hover:text-text-primary"
                        title="View Timeline"
                      >
                        <Activity className="h-4 w-4" />
                      </button>
                      {session.is_active && (
                        <button
                          onClick={() => handleEndSession(session.id)}
                          className="btn-touch rounded-lg bg-danger/10 p-1.5 text-danger transition-colors hover:bg-danger/20"
                          title="End Session"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Timeline Dialog */}
      {showTimeline && selectedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-border bg-surface-1 p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-text-primary">Session Timeline</h2>
                <p className="text-sm text-text-secondary">
                  {selectedSession.admin_name} → {selectedSession.target_user_name}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowTimeline(false);
                  setSelectedSession(null);
                }}
                className="btn-touch rounded-lg p-2 text-text-muted transition-colors hover:bg-surface-2 hover:text-text-primary"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            {/* Timeline */}
            <div className="relative space-y-4 pl-6 before:absolute before:left-2 before:top-0 before:h-full before:w-0.5 before:bg-border">
              {selectedSession.actions_performed.map((action, index) => (
                <div key={index} className="relative">
                  <div className="absolute -left-6 top-1.5 h-3 w-3 rounded-full bg-info" />
                  <div className="rounded-lg border border-border bg-surface-0 p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-text-primary">{action.action_type.replace(/_/g, " ")}</span>
                      <span className="text-xs text-text-muted">{formatDateIST(action.timestamp)}</span>
                    </div>
                    {Object.keys(action.details).length > 0 && (
                      <pre className="mt-2 overflow-x-auto text-xs text-text-secondary">
                        {JSON.stringify(action.details, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-between rounded-lg border border-border bg-surface-2 p-4">
              <div className="flex items-center gap-4 text-sm text-text-secondary">
                <span>IP: {selectedSession.ip_address}</span>
                <span>•</span>
                <span>Duration: {getDuration(selectedSession.started_at, selectedSession.ended_at)}</span>
              </div>
              {selectedSession.is_active && (
                <button
                  onClick={() => {
                    handleEndSession(selectedSession.id);
                    setShowTimeline(false);
                    setSelectedSession(null);
                  }}
                  className="btn-touch rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-danger/80"
                >
                  End Session
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// TAB 3: ACTIVITY AUDIT LOG
// ═══════════════════════════════════════════════════════

function AuditLogTab() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null);
  const [showDiff, setShowDiff] = useState(false);

  useEffect(() => {
    const mockEntries = getMockAuditLog();
    setEntries(mockEntries);
    setLoading(false);
  }, []);

  const actionTypes = [...new Set(entries.map((e) => e.action))];

  const filteredEntries = entries.filter((entry) => {
    if (actionFilter !== "all" && entry.action !== actionFilter) {return false;}
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        entry.actor_name.toLowerCase().includes(query) ||
        entry.actor_email.toLowerCase().includes(query) ||
        entry.action.toLowerCase().includes(query)
      );
    }
    return true;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex gap-4">
          <div className="h-10 flex-1 animate-pulse rounded-lg bg-surface-2" />
          <div className="h-10 w-32 animate-pulse rounded-lg bg-surface-2" />
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 rounded-lg bg-surface-1 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total Actions" value={entries.length} icon={<Activity className="h-5 w-5 text-info" />} />
        <StatCard label="Today" value={entries.filter((e) => new Date(e.created_at).toDateString() === new Date().toDateString()).length} icon={<Clock className="h-5 w-5 text-warning" />} />
        <StatCard label="Unique Actors" value={[...new Set(entries.map((e) => e.actor_id))].length} icon={<Users className="h-5 w-5 text-success" />} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by actor or action..."
            className="h-10 w-full rounded-lg border border-border bg-surface-0 py-2 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-muted focus:border-info focus:outline-none focus:ring-1 focus:ring-info"
          />
        </div>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="h-10 rounded-lg border border-border bg-surface-0 px-3 text-sm text-text-primary focus:border-info focus:outline-none focus:ring-1 focus:ring-info"
        >
          <option value="all">All Actions</option>
          {actionTypes.map((action) => (
            <option key={action} value={action}>
              {action.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <button className="btn-touch flex h-10 items-center gap-2 rounded-lg border border-border bg-surface-1 px-4 text-sm text-text-primary transition-colors hover:bg-surface-2">
          <Download className="h-4 w-4" />
          Export CSV
        </button>
        <button className="btn-touch flex h-10 items-center gap-2 rounded-lg border border-border bg-surface-1 px-4 text-sm text-text-primary transition-colors hover:bg-surface-2">
          <Download className="h-4 w-4" />
          Export JSON
        </button>
      </div>

      {/* Retention Notice */}
      <div className="flex items-center gap-2 rounded-lg border border-info/30 bg-info/10 p-3 text-sm text-info">
        <Shield className="h-4 w-4" />
        <span>Audit logs are retained for 7 years in compliance with data retention policies.</span>
      </div>

      {/* Audit Log Table */}
      {filteredEntries.length === 0 ? (
        <EmptyState icon={<FileText className="h-8 w-8" />} title="No audit entries found" description="No entries match your current filters" />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full">
            <thead className="bg-surface-2">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-text-muted">Timestamp</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-text-muted">Actor</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-text-muted">Action</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-text-muted">Resource</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-text-muted">IP Address</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-text-muted">Changes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface-1">
              {filteredEntries.map((entry) => (
                <tr key={entry.id} className="table-row-hover">
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-text-secondary">{formatDateIST(entry.created_at)}</td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-text-primary">{entry.actor_name}</p>
                      <p className="text-xs text-text-muted">{entry.actor_email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="default">{entry.action.replace(/_/g, " ")}</Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">
                    <span className="capitalize">{entry.resource_type.replace(/_/g, " ")}</span>
                    {entry.resource_id && <span className="ml-1 text-text-muted">#{entry.resource_id.slice(0, 8)}</span>}
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-text-muted">{entry.ip_address}</td>
                  <td className="px-4 py-3">
                    {entry.changes ? (
                      <button
                        onClick={() => {
                          setSelectedEntry(entry);
                          setShowDiff(true);
                        }}
                        className="btn-touch rounded-lg bg-info/10 px-2 py-1 text-xs font-medium text-info transition-colors hover:bg-info/20"
                      >
                        View Diff
                      </button>
                    ) : (
                      <span className="text-xs text-text-muted">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Diff Dialog */}
      {showDiff && selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-border bg-surface-1 p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-text-primary">Changes</h2>
                <p className="text-sm text-text-secondary">
                  {selectedEntry.action.replace(/_/g, " ")} by {selectedEntry.actor_name}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowDiff(false);
                  setSelectedEntry(null);
                }}
                className="btn-touch rounded-lg p-2 text-text-muted transition-colors hover:bg-surface-2 hover:text-text-primary"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <pre className="overflow-x-auto rounded-lg border border-border bg-surface-0 p-4 font-mono text-sm">
              {JSON.stringify(selectedEntry.changes, null, 2)}
            </pre>

            <div className="mt-4 flex items-center justify-between rounded-lg border border-border bg-surface-2 p-3 text-sm text-text-secondary">
              <span>Resource: {selectedEntry.resource_type}</span>
              <span>IP: {selectedEntry.ip_address}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// TAB 4: ADMIN ACCOUNTS
// ═══════════════════════════════════════════════════════

function AdminsTab() {
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminAccount | null>(null);
  const [newRole, setNewRole] = useState<AdminRole>("viewer");
  const [showActivityDialog, setShowActivityDialog] = useState(false);

  useEffect(() => {
    const mockAdmins = getMockAdmins();
    setAdmins(mockAdmins);
    setLoading(false);
  }, []);

  const activeAdmins = admins.filter((a) => a.is_active).length;

  const handleCreateAdmin = async (data: { name: string; email: string; role: AdminRole }) => {
    const newAdmin: AdminAccount = {
      id: `admin-${Date.now()}`,
      ...data,
      last_login_at: null,
      is_active: true,
      created_at: new Date().toISOString(),
      created_by: "admin-1",
    };
    setAdmins((prev) => [...prev, newAdmin]);
    setShowCreateDialog(false);
    toast.success(`Admin ${data.name} created successfully`);
  };

  const handleUpdateRole = async () => {
    if (!selectedAdmin) {return;}
    setAdmins((prev) =>
      prev.map((a) => (a.id === selectedAdmin.id ? { ...a, role: newRole } : a))
    );
    setShowRoleDialog(false);
    setSelectedAdmin(null);
    toast.success("Role updated successfully");
  };

  const handleDeactivate = async (adminId: string) => {
    if (!confirm("Are you sure you want to deactivate this admin?")) {return;}
    setAdmins((prev) =>
      prev.map((a) => (a.id === adminId ? { ...a, is_active: false } : a))
    );
    toast.success("Admin deactivated");
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="stat-card animate-pulse">
              <div className="h-10 w-10 rounded-lg bg-surface-2" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-20 rounded bg-surface-2" />
                <div className="h-6 w-12 rounded bg-surface-2" />
              </div>
            </div>
          ))}
        </div>
        <div className="h-64 rounded-lg bg-surface-1 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total Admins" value={admins.length} icon={<Users className="h-5 w-5 text-info" />} />
        <StatCard label="Active" value={activeAdmins} icon={<CheckCircle2 className="h-5 w-5 text-success" />} />
        <StatCard label="Super Admins" value={admins.filter((a) => a.role === "super_admin").length} icon={<Shield className="h-5 w-5 text-danger" />} />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text-primary">Admin Accounts</h2>
        <button
          onClick={() => setShowCreateDialog(true)}
          className="btn-touch flex items-center gap-2 rounded-lg bg-info px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-info/80"
        >
          <Plus className="h-4 w-4" />
          Add Admin
        </button>
      </div>

      {/* Admins Table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full">
          <thead className="bg-surface-2">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-text-muted">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-text-muted">Email</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-text-muted">Role</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-text-muted">Last Login</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-text-muted">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-text-muted">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-surface-1">
            {admins.map((admin) => (
              <tr key={admin.id} className="table-row-hover">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-info/10 text-sm font-medium text-info">
                      {admin.name.split(" ").map((n) => n[0]).join("")}
                    </div>
                    <span className="text-sm font-medium text-text-primary">{admin.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-text-secondary">{admin.email}</td>
                <td className="px-4 py-3">
                  <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", ADMIN_ROLE_COLORS[admin.role].bg, ADMIN_ROLE_COLORS[admin.role].text)}>
                    {ADMIN_ROLE_LABELS[admin.role]}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-text-secondary">
                  {admin.last_login_at ? formatRelativeTime(admin.last_login_at) : "Never"}
                </td>
                <td className="px-4 py-3">
                  {admin.is_active ? (
                    <Badge variant="success">Active</Badge>
                  ) : (
                    <Badge variant="danger">Inactive</Badge>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedAdmin(admin);
                        setShowActivityDialog(true);
                      }}
                      className="btn-touch rounded-lg p-1.5 text-text-muted transition-colors hover:bg-surface-2 hover:text-text-primary"
                      title="View Activity"
                    >
                      <Activity className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedAdmin(admin);
                        setNewRole(admin.role);
                        setShowRoleDialog(true);
                      }}
                      className="btn-touch rounded-lg p-1.5 text-text-muted transition-colors hover:bg-surface-2 hover:text-text-primary"
                      title="Edit Role"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      className="btn-touch rounded-lg p-1.5 text-text-muted transition-colors hover:bg-surface-2 hover:text-text-primary"
                      title="Reset Password"
                    >
                      <Key className="h-4 w-4" />
                    </button>
                    {admin.is_active && (
                      <button
                        onClick={() => handleDeactivate(admin.id)}
                        className="btn-touch rounded-lg p-1.5 text-danger transition-colors hover:bg-danger/10"
                        title="Deactivate"
                      >
                        <UserCog className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Role Permissions Reference */}
      <div className="rounded-lg border border-border bg-surface-1 p-4">
        <h3 className="mb-3 text-sm font-medium text-text-primary">Role Permissions</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-surface-2 p-3">
            <div className="mb-2 flex items-center gap-2">
              <Shield className="h-4 w-4 text-danger" />
              <span className="font-medium text-text-primary">Super Admin</span>
            </div>
            <ul className="space-y-1 text-xs text-text-secondary">
              <li>Full system access</li>
              <li>Manage all admins</li>
              <li>Configure pricing</li>
              <li>Impersonate users</li>
            </ul>
          </div>
          <div className="rounded-lg bg-surface-2 p-3">
            <div className="mb-2 flex items-center gap-2">
              <UserCog className="h-4 w-4 text-warning" />
              <span className="font-medium text-text-primary">Support Admin</span>
            </div>
            <ul className="space-y-1 text-xs text-text-secondary">
              <li>View dashboards</li>
              <li>Handle support tickets</li>
              <li>Impersonate (view only)</li>
              <li>Cannot modify billing</li>
            </ul>
          </div>
          <div className="rounded-lg bg-surface-2 p-3">
            <div className="mb-2 flex items-center gap-2">
              <Eye className="h-4 w-4 text-info" />
              <span className="font-medium text-text-primary">Viewer</span>
            </div>
            <ul className="space-y-1 text-xs text-text-secondary">
              <li>Read-only access</li>
              <li>View reports</li>
              <li>No impersonation</li>
              <li>No modifications</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Create Admin Dialog */}
      {showCreateDialog && (
        <CreateAdminDialog
          onClose={() => setShowCreateDialog(false)}
          onSubmit={handleCreateAdmin}
        />
      )}

      {/* Edit Role Dialog */}
      {showRoleDialog && selectedAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-surface-1 p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold text-text-primary">Edit Admin Role</h2>
            <p className="mb-4 text-sm text-text-secondary">{selectedAdmin.name}</p>
            <div className="space-y-2">
              {(["super_admin", "support_admin", "viewer"] as AdminRole[]).map((role) => (
                <label key={role} className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-surface-0 p-3 transition-colors hover:bg-surface-2">
                  <input
                    type="radio"
                    name="role"
                    value={role}
                    checked={newRole === role}
                    onChange={(e) => setNewRole(e.target.value as AdminRole)}
                    className="h-4 w-4 text-info focus:ring-info"
                  />
                  <div>
                    <p className="font-medium text-text-primary">{ADMIN_ROLE_LABELS[role]}</p>
                    <p className="text-xs text-text-muted">
                      {role === "super_admin" && "Full system access"}
                      {role === "support_admin" && "Support and view access"}
                      {role === "viewer" && "Read-only access"}
                    </p>
                  </div>
                </label>
              ))}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRoleDialog(false);
                  setSelectedAdmin(null);
                }}
                className="btn-touch rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-2"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateRole}
                className="btn-touch rounded-lg bg-info px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-info/80"
              >
                Update Role
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Activity Dialog */}
      {showActivityDialog && selectedAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-border bg-surface-1 p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-text-primary">Activity Log</h2>
                <p className="text-sm text-text-secondary">{selectedAdmin.name}</p>
              </div>
              <button
                onClick={() => {
                  setShowActivityDialog(false);
                  setSelectedAdmin(null);
                }}
                className="btn-touch rounded-lg p-2 text-text-muted transition-colors hover:bg-surface-2 hover:text-text-primary"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              {getMockAuditLog()
                .filter((e) => e.actor_id === selectedAdmin.id)
                .map((entry) => (
                  <div key={entry.id} className="rounded-lg border border-border bg-surface-0 p-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="default">{entry.action.replace(/_/g, " ")}</Badge>
                      <span className="text-xs text-text-muted">{formatRelativeTime(entry.created_at)}</span>
                    </div>
                    <p className="mt-2 text-sm text-text-secondary">{entry.resource_type}</p>
                  </div>
                ))}
              {getMockAuditLog().filter((e) => e.actor_id === selectedAdmin.id).length === 0 && (
                <p className="text-center text-sm text-text-muted">No recent activity</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CreateAdminDialog({ onClose, onSubmit }: { onClose: () => void; onSubmit: (data: { name: string; email: string; role: AdminRole }) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AdminRole>("viewer");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    onSubmit({ name, email, role });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface-1 p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-text-primary">Create Admin Account</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="h-10 w-full rounded-lg border border-border bg-surface-0 px-3 text-sm text-text-primary focus:border-info focus:outline-none focus:ring-1 focus:ring-info"
              placeholder="Full name"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-10 w-full rounded-lg border border-border bg-surface-0 px-3 text-sm text-text-primary focus:border-info focus:outline-none focus:ring-1 focus:ring-info"
              placeholder="admin@company.com"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as AdminRole)}
              className="h-10 w-full rounded-lg border border-border bg-surface-0 px-3 text-sm text-text-primary focus:border-info focus:outline-none focus:ring-1 focus:ring-info"
            >
              <option value="viewer">Viewer (Read-only)</option>
              <option value="support_admin">Support Admin</option>
              <option value="super_admin">Super Admin (Full access)</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-touch rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !name.trim() || !email.trim()}
              className="btn-touch rounded-lg bg-info px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-info/80 disabled:opacity-50"
            >
              {submitting ? "Creating..." : "Create Admin"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// TAB 5: SYSTEM HEALTH
// ═══════════════════════════════════════════════════════

function SystemHealthTab() {
  const [services, setServices] = useState<SystemHealthStatus[]>([]);
  const [jobs, setJobs] = useState<BackgroundJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  useEffect(() => {
    const mockServices = getMockSystemHealth();
    const mockJobs = getMockBackgroundJobs();
    setServices(mockServices);
    setJobs(mockJobs);
    setLoading(false);
  }, []);

  const healthyCount = services.filter((s) => s.status === "healthy").length;
  const degradedCount = services.filter((s) => s.status === "degraded").length;
  const downCount = services.filter((s) => s.status === "down").length;

  const refreshHealth = useCallback(() => {
    const mockServices = getMockSystemHealth();
    setServices(mockServices);
    setLastRefresh(new Date());
    toast.success("Health status refreshed");
  }, []);

  const getServiceIcon = (serviceName: string) => {
    if (serviceName.includes("Database")) {return <Database className="h-5 w-5" />;}
    if (serviceName.includes("Auth")) {return <Lock className="h-5 w-5" />;}
    if (serviceName.includes("Storage")) {return <Cloud className="h-5 w-5" />;}
    if (serviceName.includes("Gemini")) {return <Bot className="h-5 w-5" />;}
    if (serviceName.includes("Claude")) {return <Bot className="h-5 w-5" />;}
    if (serviceName.includes("OpenAI")) {return <Zap className="h-5 w-5" />;}
    if (serviceName.includes("Vercel")) {return <Globe className="h-5 w-5" />;}
    return <Server className="h-5 w-5" />;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="stat-card animate-pulse">
              <div className="h-10 w-10 rounded-lg bg-surface-2" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-20 rounded bg-surface-2" />
                <div className="h-6 w-12 rounded bg-surface-2" />
              </div>
            </div>
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-64 rounded-lg bg-surface-1 animate-pulse" />
          <div className="h-64 rounded-lg bg-surface-1 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Services" value={services.length} icon={<Server className="h-5 w-5 text-info" />} />
        <StatCard label="Healthy" value={healthyCount} icon={<CheckCircle2 className="h-5 w-5 text-success" />} trend="neutral" />
        <StatCard label="Degraded" value={degradedCount} icon={<AlertTriangle className="h-5 w-5 text-warning" />} trend={degradedCount > 0 ? "up" : "neutral"} />
        <StatCard label="Down" value={downCount} icon={<XCircle className="h-5 w-5 text-danger" />} trend={downCount > 0 ? "up" : "neutral"} />
      </div>

      {/* Refresh Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-text-muted">
          <RefreshCw className="h-4 w-4" />
          <span>Last updated: {formatRelativeTime(lastRefresh)}</span>
        </div>
        <button
          onClick={refreshHealth}
          className="btn-touch flex items-center gap-2 rounded-lg border border-border bg-surface-1 px-4 py-2 text-sm text-text-primary transition-colors hover:bg-surface-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh Now
        </button>
      </div>

      {/* Service Status Grid */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-text-primary">Dependency Status</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {services.map((service) => {
            const { bg, text } = HEALTH_STATUS_COLORS[service.status];
            return (
              <div key={service.service} className="rounded-lg border border-border bg-surface-1 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn("rounded-lg p-2", bg)}>
                      <span className={text}>{getServiceIcon(service.service)}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text-primary">{service.service}</p>
                      <p className={cn("text-xs font-medium", text)}>
                        {service.status.charAt(0).toUpperCase() + service.status.slice(1)}
                      </p>
                    </div>
                  </div>
                </div>
                {service.response_time_ms && (
                  <div className="mt-2 flex items-center justify-between text-xs text-text-muted">
                    <span>Response Time</span>
                    <span className={service.response_time_ms > 1000 ? "text-warning" : "text-text-secondary"}>
                      {service.response_time_ms}ms
                    </span>
                  </div>
                )}
                {service.error_message && (
                  <p className="mt-2 text-xs text-danger">{service.error_message}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Background Jobs */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-text-primary">Background Jobs</h2>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full">
            <thead className="bg-surface-2">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-text-muted">Job</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-text-muted">Schedule</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-text-muted">Last Run</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-text-muted">Next Run</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-text-muted">Duration</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-text-muted">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface-1">
              {jobs.map((job) => (
                <tr key={job.id} className="table-row-hover">
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-text-primary">{job.name}</p>
                      <p className="text-xs text-text-muted">{job.description}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <code className="rounded bg-surface-2 px-2 py-1 text-xs text-text-secondary">{job.schedule}</code>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">
                    {job.last_run ? formatRelativeTime(job.last_run) : "Never"}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">
                    {job.next_run ? formatRelativeTime(job.next_run) : "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">
                    {job.last_duration_seconds !== null ? `${job.last_duration_seconds}s` : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", JOB_STATUS_COLORS[job.status].bg, JOB_STATUS_COLORS[job.status].text)}>
                      {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Monitoring Info */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-border bg-surface-1 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm text-text-secondary">
            <Activity className="h-4 w-4" />
            <span>Heartbeat Interval</span>
          </div>
          <p className="text-2xl font-semibold text-text-primary">60s</p>
        </div>
        <div className="rounded-lg border border-border bg-surface-1 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm text-text-secondary">
            <TrendingUp className="h-4 w-4" />
            <span>Uptime (30 days)</span>
          </div>
          <p className="text-2xl font-semibold text-success">99.97%</p>
        </div>
        <div className="rounded-lg border border-border bg-surface-1 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm text-text-secondary">
            <Clock className="h-4 w-4" />
            <span>Avg Response</span>
          </div>
          <p className="text-2xl font-semibold text-text-primary">127ms</p>
        </div>
        <div className="rounded-lg border border-border bg-surface-1 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm text-text-secondary">
            <Bug className="h-4 w-4" />
            <span>Error Rate</span>
          </div>
          <p className="text-2xl font-semibold text-success">0.02%</p>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════

export default function OperationsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("alerts");

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Operations</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Monitor system health, manage admin accounts, and track security events
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="-mb-px flex gap-1 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "btn-touch flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors",
                activeTab === tab.id
                  ? "border-info text-info"
                  : "border-transparent text-text-muted hover:border-border hover:text-text-primary"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "alerts" && <AlertsTab />}
        {activeTab === "impersonation" && <ImpersonationTab />}
        {activeTab === "audit" && <AuditLogTab />}
        {activeTab === "admins" && <AdminsTab />}
        {activeTab === "health" && <SystemHealthTab />}
      </div>
    </div>
  );
}
