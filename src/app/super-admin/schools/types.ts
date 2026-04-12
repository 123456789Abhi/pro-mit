// Shared types for the Schools page
// Used by both server and client components
// Aligned with public.schools.status CHECK constraint in setup-db.sql

export type SchoolStatus =
  | "active"
  | "trial"
  | "frozen"
  | "churned"
  | "suspended";

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
  principal_phone: string | null;
  subscription_start_date: string;
  subscription_expiry_date: string;
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
}

export interface FilterOption {
  label: string;
  value: string;
  count: number;
}

export interface FilterSection {
  title: string;
  options: FilterOption[];
  type: "checkbox" | "radio";
}

// Status display configuration — aligned with public.schools.status
export const SCHOOL_STATUS_CONFIG: Record<
  SchoolStatus,
  { label: string; color: string; bgColor: string }
> = {
  active: {
    label: "Active",
    color: "text-success",
    bgColor: "bg-success/10",
  },
  trial: {
    label: "Trial",
    color: "text-warning",
    bgColor: "bg-warning/10",
  },
  frozen: {
    label: "Frozen",
    color: "text-text-muted",
    bgColor: "bg-surface-2",
  },
  churned: {
    label: "Churned",
    color: "text-danger",
    bgColor: "bg-danger/10",
  },
  suspended: {
    label: "Suspended",
    color: "text-danger",
    bgColor: "bg-danger/10",
  },
};

// Wizard steps configuration
export const WIZARD_STEPS = [
  { id: 1, name: "School Info", description: "Basic school details" },
  { id: 2, name: "Principal", description: "Create or invite principal" },
  { id: 3, name: "Subscription", description: "Plan and pricing" },
  { id: 4, name: "AI Budget", description: "Monthly limits and alerts" },
  { id: 5, name: "Branding", description: "GiNi assistant customization" },
  { id: 6, name: "Content", description: "Enable CBSE content" },
  { id: 7, name: "Review", description: "Confirm and create" },
] as const;

export type WizardStepId = (typeof WIZARD_STEPS)[number]["id"];

// Form data types for wizard
export interface SchoolWizardFormData {
  // Step 1
  name: string;
  board: string;
  city: string;
  region: string;
  academic_year: string;
  // Step 2
  principal_invite_option: "invite" | "create";
  principal_name: string;
  principal_email: string;
  principal_phone: string;
  principal_employee_id: string;
  principal_password: string;
  // Step 3
  subscription_plan: "trial" | "paid";
  subscription_duration: "14_days" | "1_month" | "3_months" | "6_months" | "12_months" | "custom";
  subscription_start_date: string;
  subscription_expiry_date: string;
  price_per_student_monthly: number;
  min_billing_students: number;
  // Step 4
  ai_monthly_budget: number;
  ai_alert_threshold: number;
  ai_is_capped: boolean;
  ai_reset_day: number;
  // Step 5
  gini_name: string;
  logo_url: string;
  primary_color: string;
  // Step 6
  auto_enable_all_books: boolean;
  enabled_book_ids: string[];
  enable_notes: boolean;
  enable_summaries: boolean;
  enable_faq: boolean;
  enable_quizzes: boolean;
  enable_drills: boolean;
}

export const DEFAULT_WIZARD_FORM_DATA: SchoolWizardFormData = {
  // Step 1
  name: "",
  board: "CBSE",
  city: "",
  region: "",
  academic_year: "2026-2027",
  // Step 2
  principal_invite_option: "invite",
  principal_name: "",
  principal_email: "",
  principal_phone: "",
  principal_employee_id: "",
  principal_password: "",
  // Step 3
  subscription_plan: "trial",
  subscription_duration: "14_days",
  subscription_start_date: new Date().toISOString().split("T")[0],
  subscription_expiry_date: "",
  price_per_student_monthly: 100,
  min_billing_students: 1,
  // Step 4
  ai_monthly_budget: 10000,
  ai_alert_threshold: 80,
  ai_is_capped: false,
  ai_reset_day: 1,
  // Step 5
  gini_name: "GiNi",
  logo_url: "",
  primary_color: "#3b82f6",
  // Step 6
  auto_enable_all_books: true,
  enabled_book_ids: [],
  enable_notes: true,
  enable_summaries: true,
  enable_faq: true,
  enable_quizzes: true,
  enable_drills: true,
};
