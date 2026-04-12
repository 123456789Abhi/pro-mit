"use server";

import { createSupabaseAdmin } from "@/lib/supabase/server";
import { z } from "zod";
import { formatInTimeZone } from "date-fns-tz";

// ═══════════════════════════════════════════════════════
// COMMAND CENTER SERVER ACTIONS
// Fetches all dashboard metrics for Super Admin panel.
// Uses admin client to bypass RLS for platform-wide data.
// ═══════════════════════════════════════════════════════

const IST_TIMEZONE = "Asia/Kolkata";

// ─────────────────────────────────────────────
// Zod Schemas
// ─────────────────────────────────────────────

const DateRangeSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
});

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type AlertSeverity = "critical" | "high" | "medium" | "low";
export type AlertStatus = "active" | "resolved" | "acknowledged";

export interface Alert {
  id: string;
  type: string;
  title: string;
  description: string;
  severity: AlertSeverity;
  status: AlertStatus;
  schoolId: string | null;
  schoolName: string | null;
  createdAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
  resolutionNote: string | null;
  metadata: Record<string, unknown>;
}

export interface PlatformMetrics {
  totalActiveSchools: number;
  totalStudents: number;
  monthlyRecurringRevenue: number;
  dailyActiveUsers: number;
  aiQueriesToday: number;
  aiQueriesMonth: number;
  platformUptime: number;
}

export interface FinancialMetrics {
  totalAiSpend: number;
  revenueVsCost: { revenue: number; cost: number; margin: number };
  avgAiCostPerStudent: number;
  topCostSchools: Array<{ schoolId: string; schoolName: string; cost: number }>;
  budgetAlerts: number;
  revenuePerSchool: number;
  revenueForecasting: {
    renewals30Days: number;
    renewals60Days: number;
    renewals90Days: number;
    estimatedRevenue: number;
  };
}

export interface EngagementMetrics {
  dailyActiveStudents: number;
  weeklyActiveStudents: number;
  studentRetention: { dauMau: number; trend: "up" | "down" | "stable" };
  aiInteractionRate: number;
  avgAiQueriesPerActiveStudent: number;
  knowledgeGapsIdentified: number;
  quizCompletionRate: number;
  quizPassRate: number;
  riskStudentCount: number;
}

export interface AiPerformanceMetrics {
  responseTimeP50: number;
  responseTimeP95: number;
  responseTimeP99: number;
  cacheHitRate: number;
  modelUsage: Array<{ model: string; queries: number; percentage: number }>;
  preGenHitRate: number;
  failedAiCalls: number;
  costPer1000Queries: number;
  avgTimeToFirstQuery: number;
}

export interface ContentPipelineMetrics {
  booksPending: number;
  booksProcessing: number;
  booksReady: number;
  booksFailed: number;
  preGenCoverage: number;
  schoolsBelow50Coverage: number;
  recentlyAddedBooks: Array<{ id: string; title: string; addedAt: string }>;
  queueDepth: number;
}

export interface SchoolHealthMetrics {
  newSchoolsThisMonth: number;
  schoolsAtRisk: number;
  schoolsExpiring30Days: number;
  trialVsPaid: { trial: number; paid: number };
  teacherOnboardingRate: number;
  teacherActivityRate: number;
  teachersLowAdoption: number;
}

export interface NotificationMetrics {
  sentToday: number;
  sentWeek: number;
  deliveryRate: number;
  failureRate: number;
  avgRating: number;
}

export interface SystemHealthMetrics {
  apiResponseTimeP95: number;
  errorRate: number;
  dbQueryTime: number;
  activeImpersonationSessions: number;
  authFailureRate: number;
  recentAdminActions: number;
  suspiciousCrossSchoolAccess: number;
}

export interface SchoolRanking {
  rank: number;
  schoolId: string;
  schoolName: string;
  studentCount: number;
  aiQueries: number;
  revenue: number;
  engagement: number;
  trend: "up" | "down" | "stable";
}

export interface CommandCenterData {
  platform: PlatformMetrics;
  financial: FinancialMetrics;
  engagement: EngagementMetrics;
  aiPerformance: AiPerformanceMetrics;
  contentPipeline: ContentPipelineMetrics;
  schoolHealth: SchoolHealthMetrics;
  notification: NotificationMetrics;
  systemHealth: SystemHealthMetrics;
  alerts: Alert[];
  schoolRankings: SchoolRanking[];
  wowGrowth: { schools: number; students: number; revenue: number };
  momComparison: { schools: number; students: number; revenue: number };
  generatedAt: string;
}

// ─────────────────────────────────────────────
// Server Actions
// ─────────────────────────────────────────────

/**
 * Get all command center data for the given date range.
 * Uses admin client to aggregate platform-wide metrics.
 */
export async function getCommandCenterData(
  dateRange: z.infer<typeof DateRangeSchema>
): Promise<{ success: true; data: CommandCenterData } | { success: false; error: string }> {
  try {
    const validated = DateRangeSchema.parse(dateRange);
    const supabase = createSupabaseAdmin() as any;

    const [
      platform,
      financial,
      engagement,
      aiPerformance,
      contentPipeline,
      schoolHealth,
      notification,
      systemHealth,
      alerts,
      schoolRankings,
      wowGrowth,
      momComparison,
    ] = await Promise.all([
      fetchPlatformMetrics(supabase, validated),
      fetchFinancialMetrics(supabase, validated),
      fetchEngagementMetrics(supabase, validated),
      fetchAiPerformanceMetrics(supabase, validated),
      fetchContentPipelineMetrics(supabase, validated),
      fetchSchoolHealthMetrics(supabase, validated),
      fetchNotificationMetrics(supabase, validated),
      fetchSystemHealthMetrics(supabase, validated),
      fetchAlerts(supabase),
      fetchSchoolRankings(supabase, validated),
      fetchWowGrowth(supabase, validated),
      fetchMomComparison(supabase, validated),
    ]);

    return {
      success: true,
      data: {
        platform,
        financial,
        engagement,
        aiPerformance,
        contentPipeline,
        schoolHealth,
        notification,
        systemHealth,
        alerts,
        schoolRankings,
        wowGrowth,
        momComparison,
        generatedAt: new Date().toISOString(),
      },
    };
  } catch (err) {
    console.error("Failed to fetch command center data:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to fetch data",
    };
  }
}

/**
 * Resolve an alert.
 */
export async function resolveAlert(
  alertId: string,
  resolutionNote: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const supabase = createSupabaseAdmin() as any;

    const { error } = await supabase
      .update({
        status: "resolved",
        resolved_at: new Date().toISOString(),
        resolution_note: resolutionNote,
      })
      .eq("id", alertId);

    if (error) {
      throw error;
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to resolve alert",
    };
  }
}

/**
 * Acknowledge an alert without resolving.
 */
export async function acknowledgeAlert(
  alertId: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const supabase = createSupabaseAdmin() as any;

    const { error } = await supabase
      .update({ status: "acknowledged" })
      .eq("id", alertId);

    if (error) {
      throw error;
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to acknowledge alert",
    };
  }
}

/**
 * Pause a school.
 */
export async function pauseSchool(
  schoolId: string,
  reason: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const supabase = createSupabaseAdmin() as any;

    const { error } = await supabase
      .update({ status: "paused", paused_reason: reason })
      .eq("id", schoolId);

    if (error) {
      throw error;
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to pause school",
    };
  }
}

/**
 * Resume a paused school.
 */
export async function resumeSchool(
  schoolId: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const supabase = createSupabaseAdmin() as any;

    const { error } = await supabase
      .update({ status: "active", paused_reason: null })
      .eq("id", schoolId);

    if (error) {
      throw error;
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to resume school",
    };
  }
}

/**
 * Trigger a background job manually.
 */
export async function triggerJob(
  jobType: "process_content" | "compute_metrics" | "send_notifications" | "pregenerate_content"
): Promise<{ success: true; jobId: string } | { success: false; error: string }> {
  try {
    const supabase = createSupabaseAdmin() as any;

    const { data, error } = await supabase.rpc("trigger_admin_job", {
      p_job_type: jobType,
    });

    if (error) {
      throw error;
    }

    return { success: true, jobId: (data as { id: string }).id };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to trigger job",
    };
  }
}

// ═══════════════════════════════════════════════════════
// Metric Fetchers (Private Helpers)
// ═══════════════════════════════════════════════════════

async function fetchPlatformMetrics(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  _dateRange: z.infer<typeof DateRangeSchema>
) {
  // Schools count
  const { count: activeSchools } = await (supabase as any).from("schools")
    .select("*", { count: "exact", head: true })
    .eq("status", "active")
    .is("deleted_at", null);

  // Students count
  const { count: totalStudents } = await (supabase as any).from("users")
    .select("*", { count: "exact", head: true })
    .eq("role", "student")
    .is("deleted_at", null);

  // Today's date in IST
  const todayIST = formatInTimeZone(new Date(), IST_TIMEZONE, "yyyy-MM-dd");
  const monthStartIST = formatInTimeZone(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    IST_TIMEZONE,
    "yyyy-MM-dd"
  );

  // Daily active users (users who logged in today)
  const { count: dailyActiveUsers } = await (supabase as any)
    .from.from("ai_usage_daily").select("*", { count: "exact", head: true })
    .gte("last_login_at", todayIST)
    .is("deleted_at", null);

  // AI queries today
  const { count: aiQueriesToday } = await (supabase as any)
    .from.from("ai_usage_daily").select("*", { count: "exact", head: true })
    .gte("created_at", todayIST);

  // AI queries this month
  const { count: aiQueriesMonth } = await (supabase as any).from("")
    .select("*", { count: "exact", head: true })
    .gte("created_at", monthStartIST);

  // MRR (simplified - sum of active subscription amounts)
  const { data: mrrData } = await supabase
  .from("school_subscriptions")
    .select("monthly_amount")
    .eq("status", "active");

  const monthlyRecurringRevenue = mrrData?.reduce((sum, sub: any) => sum + (sub.monthly_amount ?? 0), 0) ?? 0;

  return {
    totalActiveSchools: activeSchools ?? 0,
    totalStudents: totalStudents ?? 0,
    monthlyRecurringRevenue,
    dailyActiveUsers: dailyActiveUsers ?? 0,
    aiQueriesToday: aiQueriesToday ?? 0,
    aiQueriesMonth: aiQueriesMonth ?? 0,
    platformUptime: 99.95, // Would come from external monitoring
  };
}

async function fetchFinancialMetrics(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  dateRange: z.infer<typeof DateRangeSchema>
) {
  const startDate = dateRange.startDate;
  const endDate = dateRange.endDate;

  // AI costs
  const { data: aiCosts } = await supabase
  .from("ai_usage_daily")
    .select("total_cost")
    .gte("date", startDate)
    .lte("date", endDate);

  const totalAiSpend = aiCosts?.reduce((sum: number, day: any) => sum + (day.total_cost ?? 0), 0) ?? 0;

  // Revenue
  const { data: revenueData } = await supabase
  .from("school_subscriptions")
    .select("monthly_amount")
    .eq("status", "active");

  const monthlyRecurringRevenue = revenueData?.reduce((sum: number, sub: any) => sum + (sub.monthly_amount ?? 0), 0) ?? 0;


  // Students for cost per student calculation
  const { count: studentCount } = await (supabase as any)
    .from.from("users").select("*", { count: "exact", head: true })
    .eq("role", "student")
    .is("deleted_at", null);

  const avgAiCostPerStudent = studentCount ? totalAiSpend / studentCount : 0;

  // Top cost schools - query ai_usage_daily grouped by school
  const { data: schoolCosts } = await (supabase as any)
    .from.from("ai_usage_daily")
    .select("school_id, total_cost")
    .gte("date", startDate)
    .lte("date", endDate);

  // Group by school and sum
  const schoolCostMap = new Map<string, number>();
  ((schoolCosts ?? []) as any[]).forEach((row: any) => {
    schoolCostMap.set(row.school_id, (schoolCostMap.get(row.school_id) ?? 0) + (row.total_cost ?? 0));
  });

  const topCostSchools = Array.from(schoolCostMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([schoolId, cost]) => ({
      schoolId,
      schoolName: "School", // Would need a join for name
      cost,
    }));

  // Budget alerts count
  const { count: budgetAlerts } = await (supabase as any).from("schools")
    .select("*", { count: "exact", head: true })
    .eq("type", "budget_warning")
    .eq("status", "active");

  // Revenue per school
  const { count: schoolCount } = await supabase
        .from("schools").select("*", { count: "exact", head: true })
    .eq("status", "active")
    .is("deleted_at", null);

  const revenuePerSchool = schoolCount ? monthlyRecurringRevenue / schoolCount : 0;

  // Revenue forecasting (renewals due)
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  const sixtyDaysFromNow = new Date();
  sixtyDaysFromNow.setDate(sixtyDaysFromNow.getDate() + 60);
  const ninetyDaysFromNow = new Date();
  ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);

  const { data: renewals } = await (supabase as any)
    .from.from("school_subscriptions").select("monthly_amount, end_date")
    .eq("status", "active")
    .lte("end_date", ninetyDaysFromNow.toISOString());

  const renewals30Days = (renewals as any[])?.filter(
    (r) => new Date(r.end_date!) <= thirtyDaysFromNow
  ).length ?? 0;
  const renewals60Days = (renewals as any[])?.filter(
    (r) => new Date(r.end_date!) <= sixtyDaysFromNow
  ).length ?? 0;
  const renewals90Days = renewals?.length ?? 0;

  const estimatedRevenue =
    (renewals as any[])?.reduce((sum: number, r: any) => sum + (r.monthly_amount ?? 0), 0) ?? 0;

  return {
    totalAiSpend,
    revenueVsCost: {
      revenue: monthlyRecurringRevenue,
      cost: totalAiSpend,
      margin: monthlyRecurringRevenue > 0 ? ((monthlyRecurringRevenue - totalAiSpend) / monthlyRecurringRevenue) * 100 : 0,
    },
    avgAiCostPerStudent,
    topCostSchools,
    budgetAlerts: budgetAlerts ?? 0,
    revenuePerSchool,
    revenueForecasting: {
      renewals30Days,
      renewals60Days,
      renewals90Days,
      estimatedRevenue,
    },
  };
}

async function fetchEngagementMetrics(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  _dateRange: z.infer<typeof DateRangeSchema>
) {
  const todayIST = formatInTimeZone(new Date(), IST_TIMEZONE, "yyyy-MM-dd");
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoIST = formatInTimeZone(weekAgo, IST_TIMEZONE, "yyyy-MM-dd");
  const monthAgo = new Date();
  monthAgo.setDate(monthAgo.getDate() - 30);
  const monthAgoIST = formatInTimeZone(monthAgo, IST_TIMEZONE, "yyyy-MM-dd");

  // Daily active students
  const { count: dailyActiveStudents } = await (supabase as any)
    .from("ai_usage_daily")
    .eq("role", "student")

  // Weekly active students
  const { count: weeklyActiveStudents } = await (supabase as any)
    .from("ai_usage_daily")
    .eq("role", "student")

  // Monthly active students
  const { count: monthlyActiveStudents } = await (supabase as any)
    .from("ai_usage_daily")
    .eq("role", "student")

  const dauMau = monthlyActiveStudents ? (dailyActiveStudents ?? 0) / monthlyActiveStudents : 0;

  // AI interaction rate
  const { count: studentsWithAi } = await (supabase as any)
    .from.from("ai_usage_daily")
    .select("user_id")

  const { count: totalActiveStudents } = await (supabase as any)
    .from.from("users")
    .eq("role", "student")

  const aiInteractionRate = totalActiveStudents
    ? (studentsWithAi ?? 0) / totalActiveStudents
    : 0;

  // Avg AI queries per active student
  const { count: totalAiQueries } = await (supabase as any).from("ai_queries")
    .select("*", { count: "exact", head: true })
    .gte("created_at", todayIST);

  const avgAiQueriesPerActiveStudent = dailyActiveStudents
    ? (totalAiQueries ?? 0) / dailyActiveStudents
    : 0;

  // Knowledge gaps (from student analytics)
  const { data: knowledgeGaps } = await (supabase as any)
    .from.from("ai_queries")
    .select("id")
    .eq("identified_at", todayIST)
    .select("id")

  // Quiz metrics
  const { data: quizResults } = await (supabase as any).from("school_metrics")
    .select("score, status")
    .gte("completed_at", todayIST);

  const completedQuizzes = (quizResults as any[])?.filter((q: any) => q.status === "completed") ?? [];
  const passedQuizzes = completedQuizzes.filter((q: any) => (q.score ?? 0) >= 50);

  const quizCompletionRate = completedQuizzes.length / (quizResults?.length || 1);
  const quizPassRate = completedQuizzes.length > 0 ? passedQuizzes.length / completedQuizzes.length : 0;

  // Risk students
  const { count: riskStudentCount } = await (supabase as any)
    .from.from("ai_queries")
    .eq("type", "student_risk")

  return {
    dailyActiveStudents: dailyActiveStudents ?? 0,
    weeklyActiveStudents: weeklyActiveStudents ?? 0,
    studentRetention: { dauMau, trend: (dauMau > 0.3 ? "up" : dauMau > 0.2 ? "stable" : "down") as "up" | "stable" | "down" },
    aiInteractionRate,
    avgAiQueriesPerActiveStudent,
    knowledgeGapsIdentified: knowledgeGaps?.length ?? 0,
    quizCompletionRate,
    quizPassRate,
    riskStudentCount: riskStudentCount ?? 0,
  };
}

async function fetchAiPerformanceMetrics(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  dateRange: z.infer<typeof DateRangeSchema>
) {
  const startDate = dateRange.startDate;
  const endDate = dateRange.endDate;

  // Response times (from ai_usage_daily)
  const { data: aiDaily } = await (supabase as any).from("ai_usage_daily")
    .select("avg_response_time_ms, cache_hits, cache_misses, pregen_hits")
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: false })
    .limit(30);

  const avgResponseTime =
    aiDaily?.reduce((sum: number, day: any) => sum + (day.avg_response_time_ms || 0), 0) /
      (aiDaily?.length || 1) || 0;

  const totalCacheHits = aiDaily?.reduce((sum: number, day: any) => sum + (day.cache_hits ?? 0), 0) ?? 0;
  const totalCacheMisses = aiDaily?.reduce((sum: number, day: any) => sum + (day.cache_misses ?? 0), 0) ?? 0;
  const totalPregenHits = aiDaily?.reduce((sum: number, day: any) => sum + (day.pregen_hits ?? 0), 0) ?? 0;
  const totalQueries = totalCacheHits + totalCacheMisses;

  const cacheHitRate = totalQueries > 0 ? totalCacheHits / totalQueries : 0;
  const preGenHitRate = totalQueries > 0 ? totalPregenHits / totalQueries : 0;

  // Failed AI calls
  const { count: failedAiCalls } = await (supabase as any)
    .from.from("ai_queries")
    .eq("status", "failed")

  // Model usage breakdown
  const { data: modelUsage } = await (supabase as any)
    .from.from("ai_usage_daily")
    .select("model, query_count")
    .lte("date", endDate);

  const modelTotals: Record<string, number> = {};
  modelUsage?.forEach((row: any) => {
    modelTotals[row.model] = (modelTotals[row.model] ?? 0) + (row.query_count ?? 0);
  });

  const totalModelQueries = Object.values(modelTotals).reduce((a, b) => a + b, 0);
  const modelBreakdown = Object.entries(modelTotals).map(([model, queries]) => ({
    model,
    queries,
    percentage: totalModelQueries > 0 ? (queries / totalModelQueries) * 100 : 0,
  }));

  // Cost per 1000 queries
  const totalCost = aiDaily?.reduce((sum: number, day: any) => sum + (day.total_cost ?? 0), 0) ?? 0;
  const costPer1000Queries = totalQueries > 0 ? (totalCost / totalQueries) * 1000 : 0;

  // Avg time to first AI query (first query after student login)
  const { data: firstQueries } = await (supabase as any)
    .from.from("ai_queries")
    .select("created_at, users(last_login_at)")
    .lte("created_at", endDate)
    .limit(100);

  const avgTimeToFirstQuery =
    firstQueries?.reduce((sum: number, q: any) => {
      const loginTime = new Date((q.users as { last_login_at: string } | null)?.last_login_at ?? 0).getTime();
      const queryTime = new Date(q.created_at).getTime();
      return sum + (queryTime - loginTime);
    }, 0) / (firstQueries?.length || 1);

  return {
    responseTimeP50: Math.round(avgResponseTime * 0.9),
    responseTimeP95: Math.round(avgResponseTime * 1.2),
    responseTimeP99: Math.round(avgResponseTime * 1.5),
    cacheHitRate,
    modelUsage: modelBreakdown,
    preGenHitRate,
    failedAiCalls: failedAiCalls ?? 0,
    costPer1000Queries,
    avgTimeToFirstQuery: Math.round(avgTimeToFirstQuery / 1000),
  };
}

async function fetchContentPipelineMetrics(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  _validated: z.infer<typeof DateRangeSchema>,
) {
  // Books by status
  const { count: booksPending } = await (supabase as any)
    .from.from("books")
    .eq("status", "pending")

  const { count: booksProcessing } = await (supabase as any)
    .from.from("books")
    .eq("status", "processing")

  const { count: booksReady } = await (supabase as any)
    .from.from("books")
    .eq("status", "ready")

  const { count: booksFailed } = await (supabase as any)
    .from.from("books")
    .eq("status", "failed")

  // Pre-gen coverage
  const { data: coverage } = await supabase
  .from("content_coverage")
    .select("coverage_percentage")
    .is("deleted_at", null);

  const avgCoverage =
    (coverage?.reduce((sum: number, c: { coverage_percentage?: number }) => sum + (c.coverage_percentage ?? 0), 0) ?? 0) /
      (coverage?.length || 1);

  const schoolsBelow50Coverage = coverage?.filter(
    (c: { coverage_percentage?: number }) => (c.coverage_percentage ?? 0) < 50
  ).length ?? 0;

  // Recently added books
  const { data: recentBooks } = await (supabase as any).from("schools")
    .select("id, title, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  // Queue depth
  const { count: queueDepth } = await (supabase as any)
    .from.from("ai_processing_queue")
    .eq("status", "pending")
    .select("*", { count: "exact", head: true })

  return {
    booksPending: booksPending ?? 0,
    booksProcessing: booksProcessing ?? 0,
    booksReady: booksReady ?? 0,
    booksFailed: booksFailed ?? 0,
    preGenCoverage: avgCoverage,
    schoolsBelow50Coverage,
    recentlyAddedBooks:
      recentBooks?.map((b: { id: string; title: string; created_at: string }) => ({
        id: b.id,
        title: b.title,
        addedAt: b.created_at,
      })) ?? [],
    queueDepth: queueDepth ?? 0,
  };
}

async function fetchSchoolHealthMetrics(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  _dateRange: z.infer<typeof DateRangeSchema>
) {
  const monthStartIST = formatInTimeZone(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    IST_TIMEZONE,
    "yyyy-MM-dd"
  );

  // New schools this month
  const { count: newSchoolsThisMonth } = await (supabase as any).from("schools")
    .select("*", { count: "exact", head: true })
    .gte("created_at", monthStartIST)
    .is("deleted_at", null);

  // Schools at risk (no logins 7+ days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoIST = formatInTimeZone(sevenDaysAgo, IST_TIMEZONE, "yyyy-MM-dd");

  const { data: inactiveSchools } = await (supabase as any).from("schools")
    .select("school_id")
    .eq("role", "teacher")
    .is("deleted_at", null)
    .lt("last_login_at", sevenDaysAgoIST);

  const uniqueInactiveSchools = new Set(inactiveSchools?.map((u: { school_id?: string }) => u.school_id).filter(Boolean));
  const schoolsAtRisk = uniqueInactiveSchools.size;

  // Schools expiring in 30 days
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  const { count: schoolsExpiring30Days } = await (supabase as any).from("schools")
    .select("*", { count: "exact", head: true })
    .eq("status", "active")
    .lte("end_date", thirtyDaysFromNow.toISOString());

  // Trial vs paid
  const { count: trialSchools } = await (supabase as any)
    .from.from("schools")
    .eq("subscription_type", "trial")

  const { count: paidSchools } = await (supabase as any)
    .from.from("schools")
    .eq("subscription_type", "paid")

  // Teacher onboarding rate
  const { count: totalTeachers } = await (supabase as any)
    .from.from("users")
    .eq("role", "teacher")

  const { count: onboardedTeachers } = await (supabase as any)
    .from.from("users")
    .eq("role", "teacher")

  const teacherOnboardingRate = totalTeachers
    ? (onboardedTeachers ?? 0) / totalTeachers
    : 0;

  // Teacher activity rate
  const todayIST = formatInTimeZone(new Date(), IST_TIMEZONE, "yyyy-MM-dd");
  const { count: activeTeachers } = await (supabase as any)
    .from("users")
    .eq("role", "teacher")

  const teacherActivityRate = totalTeachers ? (activeTeachers ?? 0) / totalTeachers : 0;

  // Teachers low adoption
  const { count: teachersLowAdoption } = await (supabase as any)
    .from.from("users")
    .eq("type", "teacher_low_adoption")

  return {
    newSchoolsThisMonth: newSchoolsThisMonth ?? 0,
    schoolsAtRisk,
    schoolsExpiring30Days: schoolsExpiring30Days ?? 0,
    trialVsPaid: {
      trial: trialSchools ?? 0,
      paid: paidSchools ?? 0,
    },
    teacherOnboardingRate,
    teacherActivityRate,
    teachersLowAdoption: teachersLowAdoption ?? 0,
  };
}

async function fetchNotificationMetrics(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  _dateRange: z.infer<typeof DateRangeSchema>
) {
  const todayIST = formatInTimeZone(new Date(), IST_TIMEZONE, "yyyy-MM-dd");
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoIST = formatInTimeZone(weekAgo, IST_TIMEZONE, "yyyy-MM-dd");

  // Sent today
  const { count: sentToday } = await (supabase as any)
    .from.from("notifications")
    .select("*")
    .gte("sent_at", todayIST);

  // Sent this week
  const { count: sentWeek } = await (supabase as any)
    .from.from("notifications")
    .select("*")
    .gte("sent_at", weekAgoIST);

  // Delivery rate
  const { data: deliveryStats } = await (supabase as any)
    .from.from("notification_delivery")
    .select("delivered_count, recipient_count")

  const totalDelivered = deliveryStats?.reduce((sum: number, n: any) => sum + (n.delivered_count ?? 0), 0) ?? 0;
  const totalRecipients = deliveryStats?.reduce((sum: number, n: any) => sum + (n.recipient_count ?? 0), 0) ?? 0;
  const deliveryRate = totalRecipients > 0 ? totalDelivered / totalRecipients : 0;

  // Failure rate
  const { count: failedDeliveries } = await (supabase as any)
    .from.from("notification_delivery")
    .eq("delivery_status", "failed")

  const failureRate = totalRecipients > 0 ? (failedDeliveries ?? 0) / totalRecipients : 0;

  // Average rating
  const { data: ratings } = await supabase
  .from("notification_ratings")
    .select("rating")
    .gte("created_at", weekAgoIST);

  const avgRating =
    ratings && ratings.length > 0
      ? ratings.reduce((sum: number, r: any) => sum + (r.rating ?? 0), 0) / ratings.length
      : 0;

  return {
    sentToday: sentToday ?? 0,
    sentWeek: sentWeek ?? 0,
    deliveryRate,
    failureRate,
    avgRating,
  };
}

async function fetchSystemHealthMetrics(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  dateRange: z.infer<typeof DateRangeSchema>
) {
  const startDate = dateRange.startDate;
  const endDate = dateRange.endDate;

  // API response time (would come from monitoring service)
  const { data: apiMetrics } = await supabase
  .from("api_metrics_daily")
    .select("p95_response_ms")
    .gte("date", startDate)
    .lte("date", endDate);

  const apiResponseTimeP95 =
    (apiMetrics?.reduce((sum: number, m: { p95_response_ms?: number }) => sum + (m.p95_response_ms ?? 0), 0) ?? 0) /
      (apiMetrics?.length || 1);

  // Error rate
  const { data: errorMetrics } = await (supabase as any)
    .from.from("api_errors")
    .select("error_count, total_requests")
    .lte("date", endDate);

  const totalErrorCount = errorMetrics?.reduce((sum: number, x: any) => sum + (x.error_count ?? 0), 0) ?? 0;
  const totalRequests = errorMetrics?.reduce((sum: number, m: any) => sum + (m.total_requests ?? 0), 0) ?? 1;
  const errorRate = totalRequests > 0 ? totalErrorCount / totalRequests : 0;

  // DB query time
  const { data: dbMetrics } = await supabase
  .from("db_metrics_daily")
    .select("avg_query_ms")
    .gte("date", startDate)
    .lte("date", endDate);

  const dbQueryTime =
    (dbMetrics?.reduce((sum: number, m: { avg_query_ms?: number }) => sum + (m.avg_query_ms ?? 0), 0) ?? 0) /
      (dbMetrics?.length || 1);

  // Active impersonation sessions
  const { count: activeImpersonationSessions } = await (supabase as any)
    .from.from("admin_sessions")
    .select("*")

  // Auth failure rate
  const { data: authMetrics } = await (supabase as any)
    .from.from("auth_logs")
    .select("failed_logins, total_logins")
    .lte("date", endDate);

  const totalFailedLogins = authMetrics?.reduce((sum: number, x: any) => sum + (x.failed_logins ?? 0), 0) ?? 0;
  const totalLogins = authMetrics?.reduce((sum: number, m: any) => sum + (m.total_logins ?? 0), 0) ?? 1;
  const authFailureRate = totalLogins > 0 ? totalFailedLogins / totalLogins : 0;

  // Recent admin actions
  const { count: recentAdminActions } = await (supabase as any)
    .from.from("admin_actions")
    .eq("actor_role", "super_admin")

  // Suspicious cross-school access
  const { count: suspiciousCrossSchoolAccess } = await (supabase as any)
    .from.from("admin_actions")
    .eq("type", "suspicious_cross_school_access")

  return {
    apiResponseTimeP95,
    errorRate,
    dbQueryTime,
    activeImpersonationSessions: activeImpersonationSessions ?? 0,
    authFailureRate,
    recentAdminActions: recentAdminActions ?? 0,
    suspiciousCrossSchoolAccess: suspiciousCrossSchoolAccess ?? 0,
  };
}

async function fetchAlerts(
  supabase: ReturnType<typeof createSupabaseAdmin>
): Promise<Alert[]> {
  const { data: alerts } = await (supabase as any)
    .from.from("admin_alerts")
    .select("id, type, title, description, severity, status, school_id, created_at, resolved_at, resolved_by, resolution_note, metadata"
    )
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(50);

  // Get school names for alerts that have school_id
  const schoolIds = [...new Set(alerts?.map((a: { school_id?: string }) => a.school_id).filter(Boolean) ?? [])];

  let schoolNames: Record<string, string> = {};
  if (schoolIds.length > 0) {
    const { data: schools } = await (supabase as any)
    .from.from("schools")
    .select("id, name")

    schoolNames =
      schools?.reduce((acc: Record<string, string>, s: any) => {
        acc[s.id] = s.name;
        return acc;
      }, {} as Record<string, string>) ?? {};
  }

  return (
    alerts?.map((a: any) => ({
      id: a.id,
      type: a.type,
      title: a.title,
      description: a.description ?? "",
      severity: a.severity as AlertSeverity,
      status: a.status as AlertStatus,
      schoolId: a.school_id,
      schoolName: a.school_id ? schoolNames[a.school_id] : null,
      createdAt: a.created_at,
      resolvedAt: a.resolved_at,
      resolvedBy: a.resolved_by,
      resolutionNote: a.resolution_note,
      metadata: (a.metadata as Record<string, unknown>) ?? {},
    })) ?? []
  );
}

async function fetchSchoolRankings(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  dateRange: z.infer<typeof DateRangeSchema>
): Promise<SchoolRanking[]> {
  const startDate = dateRange.startDate;
  const endDate = dateRange.endDate;

  const { data: rankings } = await (supabase as any)
    .from.from("schools")
    .select("school_id, schools(id, name), student_count, ai_query_count, revenue, engagement_score"
    )
    .gte("date", startDate)
    .lte("date", endDate)
    .order("engagement_score", { ascending: false })
    .limit(20);

  return (
    rankings?.map((r: any, index: number) => ({
      rank: index + 1,
      schoolId: r.school_id,
      schoolName: (r.schools as { name: string } | null)?.name ?? "Unknown",
      studentCount: r.student_count ?? 0,
      aiQueries: r.ai_query_count ?? 0,
      revenue: r.revenue ?? 0,
      engagement: r.engagement_score ?? 0,
      trend: "stable" as const,
    })) ?? []
  );
}

async function fetchWowGrowth(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  dateRange: z.infer<typeof DateRangeSchema>
) {
  const endDate = new Date(dateRange.endDate);
  const startDate = new Date(dateRange.startDate);
  const wowEnd = new Date(endDate);
  wowEnd.setDate(wowEnd.getDate() - 7);
  const wowStart = new Date(startDate);
  wowStart.setDate(wowStart.getDate() - 7);

  const wowEndIST = formatInTimeZone(wowEnd, IST_TIMEZONE, "yyyy-MM-dd");
  const wowStartIST = formatInTimeZone(wowStart, IST_TIMEZONE, "yyyy-MM-dd");

  // Current period
  const { data: currentMetrics } = await supabase
  .from("school_daily_metrics")
    .select("revenue")
    .gte("date", dateRange.startDate)
    .lte("date", dateRange.endDate);

  // Previous period (week over week)
  const { data: prevMetrics } = await supabase
  .from("school_daily_metrics")
    .select("revenue")
    .gte("date", wowStartIST)
    .lte("date", wowEndIST);

  const currentRevenue = prevMetrics?.reduce((sum: number, x: any) => sum + (x.revenue ?? 0), 0) ?? 0;
  const prevRevenue = prevMetrics?.reduce((sum: number, m: any) => sum + (m.revenue ?? 0), 0) ?? 0;

  const revenueGrowth = prevRevenue > 0 ? ((currentRevenue - prevRevenue) / prevRevenue) * 100 : 0;

  // Schools growth
  const { count: currentSchools } = await (supabase as any).from("schools")
    .select("*", { count: "exact", head: true })
    .lte("created_at", dateRange.endDate)
    .is("deleted_at", null);

  const { count: prevSchools } = await (supabase as any)
    .from.from("schools")
    .select("*")
    .is("deleted_at", null);

  const schoolsGrowth =
    prevSchools && prevSchools > 0
      ? ((currentSchools ?? 0) - prevSchools) / prevSchools * 100
      : 0;

  // Students growth
  const { count: currentStudents } = await (supabase as any).from("schools")
    .select("*", { count: "exact", head: true })
    .eq("role", "student")
    .lte("created_at", dateRange.endDate)
    .is("deleted_at", null);

  const { count: prevStudents } = await (supabase as any)
    .from.from("users")
    .eq("role", "student")

  const studentsGrowth =
    prevStudents && prevStudents > 0
      ? ((currentStudents ?? 0) - prevStudents) / prevStudents * 100
      : 0;

  return {
    schools: schoolsGrowth,
    students: studentsGrowth,
    revenue: revenueGrowth,
  };
}

async function fetchMomComparison(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  dateRange: z.infer<typeof DateRangeSchema>
) {
  const currentEnd = new Date(dateRange.endDate);
  const currentStart = new Date(dateRange.startDate);
  const prevEnd = new Date(currentStart);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - currentStart.getDate() + currentEnd.getDate());

  const prevStartIST = formatInTimeZone(prevStart, IST_TIMEZONE, "yyyy-MM-dd");
  const prevEndIST = formatInTimeZone(prevEnd, IST_TIMEZONE, "yyyy-MM-dd");

  // Current period schools
  const { count: currentSchools } = await (supabase as any).from("schools")
    .select("*", { count: "exact", head: true })
    .gte("created_at", dateRange.startDate)
    .lte("created_at", dateRange.endDate)
    .is("deleted_at", null);

  // Previous period schools
  const { count: prevSchools } = await (supabase as any).from("schools")
    .select("*", { count: "exact", head: true })
    .gte("created_at", prevStartIST)
    .lte("created_at", prevEndIST)
    .is("deleted_at", null);

  const schoolsGrowth =
    prevSchools && prevSchools > 0
      ? ((currentSchools ?? 0) - prevSchools) / prevSchools * 100
      : 0;

  // Current period students
  const { count: currentStudents } = await (supabase as any).from("schools")
    .select("*", { count: "exact", head: true })
    .eq("role", "student")
    .gte("created_at", dateRange.startDate)
    .lte("created_at", dateRange.endDate)
    .is("deleted_at", null);

  // Previous period students
  const { count: prevStudents } = await (supabase as any)
    .from.from("users")
    .eq("role", "student")

  const studentsGrowth =
    prevStudents && prevStudents > 0
      ? ((currentStudents ?? 0) - prevStudents) / prevStudents * 100
      : 0;

  // Current period revenue
  const { data: currentRevenue } = await supabase
  .from("school_daily_metrics")
    .select("revenue")
    .gte("date", dateRange.startDate)
    .lte("date", dateRange.endDate);

  // Previous period revenue
  const { data: prevRevenue } = await supabase
  .from("school_daily_metrics")
    .select("revenue")
    .gte("date", prevStartIST)
    .lte("date", prevEndIST);

  const currentRevenueTotal =
    currentRevenue?.reduce((sum: number, m: any) => sum + (m.revenue ?? 0), 0) ?? 0;
  const prevRevenueTotal =
    prevRevenue?.reduce((sum: number, m: any) => sum + (m.revenue ?? 0), 0) ?? 0;

  const revenueGrowth =
    prevRevenueTotal > 0
      ? ((currentRevenueTotal - prevRevenueTotal) / prevRevenueTotal) * 100
      : 0;

  return {
    schools: schoolsGrowth,
    students: studentsGrowth,
    revenue: revenueGrowth,
  };
}
