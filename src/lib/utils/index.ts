import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatInTimeZone } from "date-fns-tz";
import { formatDistanceToNow } from "date-fns";

/**
 * Merge Tailwind classes with clsx + tailwind-merge.
 * Used in every component for conditional class application.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─────────────────────────────────────────────
// Indian Locale Formatters
// ─────────────────────────────────────────────

const IST_TIMEZONE = "Asia/Kolkata";

/**
 * Format currency in Indian Rupees with proper separators.
 * ₹1,00,000 (Indian numbering: lakhs, crores)
 */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format INR with decimals (for AI costs).
 * ₹4,523.45
 */
export function formatINRDecimal(amount: number, decimals = 2): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

/**
 * Format number with Indian separators.
 * 1,00,000
 */
export function formatIndianNumber(num: number): string {
  return new Intl.NumberFormat("en-IN").format(num);
}

/**
 * Format date in IST timezone.
 * "15 Apr 2026, 2:30 PM"
 */
export function formatDateIST(date: string | Date): string {
  return formatInTimeZone(
    new Date(date),
    IST_TIMEZONE,
    "d MMM yyyy, h:mm a"
  );
}

/**
 * Format date only in IST.
 * "15 Apr 2026"
 */
export function formatDateOnlyIST(date: string | Date): string {
  return formatInTimeZone(
    new Date(date),
    IST_TIMEZONE,
    "d MMM yyyy"
  );
}

/**
 * Format time only in IST.
 * "2:30 PM"
 */
export function formatTimeIST(date: string | Date): string {
  return formatInTimeZone(
    new Date(date),
    IST_TIMEZONE,
    "h:mm a"
  );
}

/**
 * Relative time from now.
 * "5 minutes ago", "2 hours ago", "3 days ago"
 */
export function formatRelativeTime(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

/**
 * Get current IST date as YYYY-MM-DD string.
 */
export function getTodayIST(): string {
  return formatInTimeZone(new Date(), IST_TIMEZONE, "yyyy-MM-dd");
}

// ─────────────────────────────────────────────
// 9-Point Grading (NEP 2020 CBSE)
// ─────────────────────────────────────────────

export type NinePointGrade = "A1" | "A2" | "B1" | "B2" | "C1" | "C2" | "D" | "E1" | "E2";

const GRADE_THRESHOLDS: Array<{ min: number; grade: NinePointGrade; label: string }> = [
  { min: 91, grade: "A1", label: "Outstanding" },
  { min: 81, grade: "A2", label: "Excellent" },
  { min: 71, grade: "B1", label: "Very Good" },
  { min: 61, grade: "B2", label: "Good" },
  { min: 51, grade: "C1", label: "Above Average" },
  { min: 41, grade: "C2", label: "Average" },
  { min: 33, grade: "D", label: "Below Average" },
  { min: 21, grade: "E1", label: "Needs Improvement" },
  { min: 0, grade: "E2", label: "Needs Significant Improvement" },
];

export function scoreToGrade(percentage: number): { grade: NinePointGrade; label: string } {
  const clamped = Math.max(0, Math.min(100, percentage));
  const match = GRADE_THRESHOLDS.find((t) => clamped >= t.min);
  return match ?? { grade: "E2", label: "Needs Significant Improvement" };
}

/**
 * Grade color for UI rendering.
 */
export function gradeColor(grade: NinePointGrade): string {
  const colors: Record<NinePointGrade, string> = {
    A1: "text-success",
    A2: "text-success",
    B1: "text-info",
    B2: "text-info",
    C1: "text-warning",
    C2: "text-warning",
    D: "text-danger",
    E1: "text-danger",
    E2: "text-danger",
  };
  return colors[grade];
}

// ─────────────────────────────────────────────
// Trend & Risk Helpers
// ─────────────────────────────────────────────

export type Trend = "improving" | "stable" | "declining";
export type RiskLevel = "low" | "medium" | "high";

export function trendIcon(trend: Trend): string {
  const icons: Record<Trend, string> = {
    improving: "↑",
    stable: "→",
    declining: "↓",
  };
  return icons[trend];
}

export function trendColor(trend: Trend): string {
  const colors: Record<Trend, string> = {
    improving: "text-success",
    stable: "text-text-secondary",
    declining: "text-danger",
  };
  return colors[trend];
}

export function riskColor(level: RiskLevel): string {
  const colors: Record<RiskLevel, string> = {
    low: "text-success",
    medium: "text-warning",
    high: "text-danger",
  };
  return colors[level];
}

// ─────────────────────────────────────────────
// Pagination
// ─────────────────────────────────────────────

export const DEFAULT_PAGE_SIZE = 50;

export interface PaginationParams {
  cursor?: string;
  pageSize?: number;
  direction?: "forward" | "backward";
}

export interface PaginatedResult<T> {
  data: T[];
  nextCursor: string | null;
  prevCursor: string | null;
  hasMore: boolean;
  totalCount?: number;
}

// ─────────────────────────────────────────────
// CBSE Subject Helpers
// ─────────────────────────────────────────────

export const CBSE_STREAMS = ["Science", "Commerce", "Humanities"] as const;
export type Stream = (typeof CBSE_STREAMS)[number];

export function gradeHasStream(grade: number): boolean {
  return grade >= 11;
}

export function getGradeTierLabel(grade: number): string {
  if (grade >= 6 && grade <= 8) {return "Middle Stage";}
  if (grade >= 9 && grade <= 10) {return "Secondary Stage";}
  return "Senior Secondary";
}
