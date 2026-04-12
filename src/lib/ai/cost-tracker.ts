import {
  AIModel,
  AIRequestLog,
  BudgetCheckResult,
  MODEL_COSTS_INR,
  ResponseSource,
} from "./types";

// ─────────────────────────────────────────────
// Supabase client type (injected, not imported here)
// ─────────────────────────────────────────────
interface SupabaseClient {
  from: (table: string) => {
    insert: (data: Record<string, unknown>) => { error: { message: string } | null };
    select: (columns?: string) => {
      eq: (col: string, val: string | number) => {
        gte: (col: string, val: string) => {
          lte: (col: string, val: string) => {
            single: () => Promise<{ data: Record<string, unknown> | null; error: { message: string } | null }>;
          };
          select: (columns?: string) => Promise<{ data: Record<string, unknown>[] | null; error: { message: string } | null }>;
        };
        single: () => Promise<{ data: Record<string, unknown> | null; error: { message: string } | null }>;
      };
    };
    upsert: (data: Record<string, unknown>, options?: { onConflict: string }) => {
      error: { message: string } | null;
    };
  };
  rpc: (fn: string, params: Record<string, unknown>) => Promise<{
    data: unknown;
    error: { message: string } | null;
  }>;
}

/**
 * Calculates actual cost from token usage.
 * Called AFTER the API response is received (we know exact tokens).
 */
export function calculateActualCost(
  model: AIModel,
  tokensIn: number,
  tokensOut: number
): number {
  const costs = MODEL_COSTS_INR[model];
  const inputCost = (tokensIn / 1_000_000) * costs.input;
  const outputCost = (tokensOut / 1_000_000) * costs.output;
  return Math.round((inputCost + outputCost) * 10000) / 10000;
}

/**
 * Logs an AI request to the ai_request_log table.
 * Called after every AI interaction (including cache hits at ₹0).
 */
export async function logAIRequest(
  supabase: SupabaseClient,
  log: AIRequestLog
): Promise<void> {
  const { error } = await supabase.from("ai_request_log").insert({
    school_id: log.schoolId,
    student_id: log.studentId,
    question: log.question.slice(0, 500), // Truncate for storage
    response_source: log.responseSource,
    model_used: log.modelUsed,
    tokens_in: log.tokensIn,
    tokens_out: log.tokensOut,
    cost_inr: log.costInr,
    latency_ms: log.latencyMs,
    pregen_item_id: log.pregenItemId,
    cache_key: log.cacheKey,
    feature: log.feature,
    grade_tier: log.gradeTier,
    subject_category: log.subjectCategory,
    query_complexity: log.queryComplexity,
  });

  if (error) {
    // Structured logging — never console.log in production
    // This would go to your logging service (Sentry, etc.)
    throw new Error(`[ai_cost_tracker] Failed to log AI request: ${error.message}`);
  }
}

/**
 * Checks if a school has budget remaining for AI calls.
 * Returns detailed budget status for UI display.
 */
export async function checkSchoolBudget(
  supabase: SupabaseClient,
  schoolId: string
): Promise<BudgetCheckResult> {
  const { data, error } = await supabase
    .from("school_ai_budget")
    .select("monthly_budget, current_spend, alert_threshold, is_capped")
    .eq("school_id", schoolId)
    .single();

  // No budget record = unlimited (free trial or uncapped school)
  if (error || !data) {
    return {
      allowed: true,
      currentSpend: 0,
      monthlyBudget: Infinity,
      remainingBudget: Infinity,
      usagePercentage: 0,
      alertTriggered: false,
    };
  }

  const budget = data as {
    monthly_budget: number;
    current_spend: number;
    alert_threshold: number;
    is_capped: boolean;
  };

  const remaining = budget.monthly_budget - budget.current_spend;
  const usagePercentage = (budget.current_spend / budget.monthly_budget) * 100;
  const alertTriggered = usagePercentage >= budget.alert_threshold;

  return {
    allowed: !budget.is_capped || remaining > 0,
    currentSpend: budget.current_spend,
    monthlyBudget: budget.monthly_budget,
    remainingBudget: Math.max(0, remaining),
    usagePercentage: Math.round(usagePercentage * 100) / 100,
    alertTriggered,
  };
}

/**
 * Increments the school's current spend after a paid API call.
 * Uses atomic increment via RPC to avoid race conditions.
 */
export async function incrementSchoolSpend(
  supabase: SupabaseClient,
  schoolId: string,
  costInr: number
): Promise<void> {
  if (costInr <= 0) {return;} // Cache hits cost nothing

  const { error } = await supabase.rpc("increment_ai_spend", {
    p_school_id: schoolId,
    p_amount: costInr,
  });

  if (error) {
    throw new Error(`[ai_cost_tracker] Failed to increment spend: ${error.message}`);
  }
}

/**
 * Updates daily usage counters for a student.
 * Tracks: ai_calls, pregen_served, cache_hits per day.
 */
export async function updateDailyUsage(
  supabase: SupabaseClient,
  studentId: string,
  responseSource: ResponseSource
): Promise<void> {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  const incrementField =
    responseSource === ResponseSource.PREGEN_FAQ
      ? "pregen_served"
      : responseSource === ResponseSource.EXACT_CACHE ||
          responseSource === ResponseSource.SEMANTIC_CACHE
        ? "cache_hits"
        : "ai_calls";

  const { error } = await supabase.rpc("upsert_daily_usage", {
    p_student_id: studentId,
    p_date: today,
    p_field: incrementField,
  });

  if (error) {
    throw new Error(`[ai_cost_tracker] Failed to update daily usage: ${error.message}`);
  }
}

/**
 * Returns cost analytics for the Super Admin AI Cost Monitor page.
 */
export async function getCostAnalytics(
  supabase: SupabaseClient,
  dateFrom: string,
  dateTo: string
): Promise<{
  totalQueries: number;
  cachedFree: number;
  paidApiCalls: number;
  totalCostInr: number;
  cacheSavingsInr: number;
  costByModel: Record<string, number>;
  costBySchool: Array<{ schoolId: string; schoolName: string; cost: number }>;
}> {
  // Aggregate query using Supabase RPC for performance
  const { data, error } = await supabase.rpc("get_ai_cost_analytics", {
    p_date_from: dateFrom,
    p_date_to: dateTo,
  });

  if (error) {
    throw new Error(`[ai_cost_tracker] Failed to get cost analytics: ${error.message}`);
  }

  const analytics = data as {
    total_queries: number;
    cached_free: number;
    paid_api_calls: number;
    total_cost_inr: number;
    cache_savings_inr: number;
    cost_by_model: Record<string, number>;
    cost_by_school: Array<{ school_id: string; school_name: string; cost: number }>;
  };

  return {
    totalQueries: analytics.total_queries,
    cachedFree: analytics.cached_free,
    paidApiCalls: analytics.paid_api_calls,
    totalCostInr: analytics.total_cost_inr,
    cacheSavingsInr: analytics.cache_savings_inr,
    costByModel: analytics.cost_by_model,
    costBySchool: analytics.cost_by_school.map((s) => ({
      schoolId: s.school_id,
      schoolName: s.school_name,
      cost: s.cost,
    })),
  };
}
