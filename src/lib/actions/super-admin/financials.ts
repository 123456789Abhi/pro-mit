"use server";

import { z } from "zod";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { headers } from "next/headers";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; code: string };

// ─────────────────────────────────────────────
// Zod Schemas
// ─────────────────────────────────────────────

export const UpdatePriceSchema = z.object({
  schoolId: z.string().uuid(),
  pricePerStudent: z.number().positive().multipleOf(0.01),
});

export const UpdatePricingSchema = z.object({
  defaultPricePerStudent: z.number().positive().multipleOf(0.01),
  infraCostPerSchool: z.number().nonnegative().multipleOf(0.01),
  billingCycle: z.enum(["monthly", "annual"]),
});

export const BillingCycleSchema = z.object({
  schoolId: z.string().uuid(),
  billingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const SendInvoiceSchema = z.object({
  schoolId: z.string().uuid(),
  billingPeriod: z.string().min(1),
});

// ─────────────────────────────────────────────
// Revenue Types
// ─────────────────────────────────────────────

export interface SchoolRevenue {
  schoolId: string;
  schoolName: string;
  region: string;
  studentCount: number;
  pricePerStudent: number;
  monthlyRevenue: number;
  aiCost: number;
  infraCost: number;
  profit: number;
  profitMargin: number;
  billingStatus: "paid" | "unpaid" | "overdue";
  lastBillingDate: string | null;
  nextBillingDate: string | null;
  pricingTier: "economy" | "standard" | "premium";
}

export interface RevenueMetrics {
  totalMRR: number;
  revenueThisMonth: number;
  revenueLastMonth: number;
  momGrowth: number;
  totalSchools: number;
  activeSchools: number;
  totalStudents: number;
}

export interface RevenueChart {
  month: string;
  revenue: number;
  cost: number;
  mrr: number;
}

export interface PricingTier {
  name: string;
  minPrice: number;
  maxPrice: number;
  schoolCount: number;
  revenue: number;
}

// ─────────────────────────────────────────────
// AI Cost Types
// ─────────────────────────────────────────────

export interface AICostData {
  schoolId: string;
  schoolName: string;
  totalCost: number;
  geminiCost: number;
  claudeHaikuCost: number;
  claudeSonnetCost: number;
  queryCount: number;
  costPerQuery: number;
  budgetLimit: number | null;
  budgetUsed: number;
  budgetRemaining: number;
}

export interface CostTrend {
  date: string;
  totalCost: number;
  geminiCost: number;
  claudeHaikuCost: number;
  claudeSonnetCost: number;
  queryCount: number;
}

export interface CostAnalytics {
  totalSpend: number;
  monthlySpend: number;
  dailySpend: number;
  cacheSavings: number;
  avgCostPerQuery: number;
  topSchools: AICostData[];
  trend: CostTrend[];
  byModel: Record<string, number>;
  byGradeTier: Record<string, number>;
}

// ─────────────────────────────────────────────
// Pricing Types
// ─────────────────────────────────────────────

export interface PlatformPricing {
  defaultPricePerStudent: number;
  infraCostPerSchool: number;
  billingCycle: "monthly" | "annual";
  minStudents: number;
  tiers: PricingTier[];
}

// ─────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────

function getClientIp(): string {
  const headersList = headers();
  return headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headersList.get("x-real-ip") ||
    "0.0.0.0";
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) {return err.message;}
  return "An unexpected error occurred";
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// ─────────────────────────────────────────────
// Revenue Overview Actions
// ─────────────────────────────────────────────

export async function getRevenueMetrics(): Promise<ActionResult<RevenueMetrics>> {
  try {
    const supabase = await createSupabaseServer() as any;

    // Get all schools with billing info
    const { data: schools, error: schoolsError } = await supabase
    .from("schools")
      .select(`
        id,
        name,
        status,
        school_billing (
          price_per_student,
          billing_status,
          last_billing_date,
          next_billing_date
        ),
        school_metrics (
          student_count
        )
      `)
      .is("deleted_at", null);

    if (schoolsError) {
      return { success: false, error: schoolsError.message, code: "DB_ERROR" };
    }

    // Calculate metrics
    const now = new Date();
    const thisMonth = now.toISOString().slice(0, 7);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 7);

    let totalMRR = 0;
    let revenueThisMonth = 0;
    let revenueLastMonth = 0;
    let totalStudents = 0;
    let activeSchools = 0;

    for (const school of schools || []) {
      const billing = (school.school_billing as Record<string, unknown>) || {};
      const metrics = (school.school_metrics as Record<string, unknown>) || {};
      const studentCount = (metrics.student_count as number) || 0;
      const pricePerStudent = (billing.price_per_student as number) || 0;
      const monthlyRevenue = pricePerStudent * studentCount;

      totalMRR += monthlyRevenue;
      totalStudents += studentCount;

      if (school.status === "active") {
        activeSchools++;
      }

      // Check billing dates for monthly revenue calculation
      const lastBilling = (billing.last_billing_date as string) || "";
      if (lastBilling.startsWith(thisMonth)) {
        revenueThisMonth += monthlyRevenue;
      } else if (lastBilling.startsWith(lastMonth)) {
        revenueLastMonth += monthlyRevenue;
      }
    }

    const momGrowth = revenueLastMonth > 0
      ? ((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100
      : 0;

    return {
      success: true,
      data: {
        totalMRR,
        revenueThisMonth,
        revenueLastMonth,
        momGrowth: Math.round(momGrowth * 100) / 100,
        totalSchools: schools?.length || 0,
        activeSchools,
        totalStudents,
      },
    };
  } catch (err) {
    return { success: false, error: getErrorMessage(err), code: "INTERNAL_ERROR" };
  }
}

export async function getSchoolRevenues(): Promise<ActionResult<SchoolRevenue[]>> {
  try {
    const supabase = await createSupabaseServer() as any;

    const { data: schools, error } = await supabase
    .from("schools")
      .select(`
        id,
        name,
        region,
        school_billing (
          price_per_student,
          billing_status,
          last_billing_date,
          next_billing_date,
          monthly_ai_cost,
          monthly_infra_cost
        ),
        school_metrics (
          student_count
        )
      `)
      .is("deleted_at", null);

    if (error) {
      return { success: false, error: error.message, code: "DB_ERROR" };
    }

    const revenues: SchoolRevenue[] = [];

    for (const school of schools || []) {
      const billing = (school.school_billing as Record<string, unknown>) || {};
      const metrics = (school.school_metrics as Record<string, unknown>) || {};

      const studentCount = (metrics.student_count as number) || 0;
      const pricePerStudent = (billing.price_per_student as number) || 0;
      const monthlyRevenue = pricePerStudent * studentCount;
      const aiCost = (billing.monthly_ai_cost as number) || 0;
      const infraCost = (billing.monthly_infra_cost as number) || 350; // Default infra cost
      const profit = monthlyRevenue - aiCost - infraCost;
      const profitMargin = monthlyRevenue > 0 ? (profit / monthlyRevenue) * 100 : 0;

      // Determine pricing tier
      let pricingTier: "economy" | "standard" | "premium" = "standard";
      if (pricePerStudent < 50) {pricingTier = "economy";}
      else if (pricePerStudent > 150) {pricingTier = "premium";}

      revenues.push({
        schoolId: school.id,
        schoolName: school.name,
        region: (school.region as string) || "Unknown",
        studentCount,
        pricePerStudent,
        monthlyRevenue,
        aiCost,
        infraCost,
        profit,
        profitMargin: Math.round(profitMargin * 100) / 100,
        billingStatus: (billing.billing_status as "paid" | "unpaid" | "overdue") || "unpaid",
        lastBillingDate: billing.last_billing_date as string | null,
        nextBillingDate: billing.next_billing_date as string | null,
        pricingTier,
      });
    }

    // Sort by revenue descending
    revenues.sort((a, b) => b.monthlyRevenue - a.monthlyRevenue);

    return { success: true, data: revenues };
  } catch (err) {
    return { success: false, error: getErrorMessage(err), code: "INTERNAL_ERROR" };
  }
}

export async function getRevenueCharts(dateFrom: string, dateTo: string): Promise<ActionResult<RevenueChart[]>> {
  try {
    const supabase = await createSupabaseServer() as any;

    const { data, error } = await supabase
    .from("monthly_revenue")
      .select("*")
      .gte("month", dateFrom)
      .lte("month", dateTo)
      .order("month", { ascending: true });

    if (error) {
      // Table might not exist yet - return empty array
      return { success: true, data: [] };
    }

    const _data = (data || []) as any[];
    const charts: RevenueChart[] = _data.map((row: any) => ({
      month: row.month as string,
      revenue: row.total_revenue as number,
      cost: row.total_cost as number,
      mrr: row.mrr as number,
    }));

    return { success: true, data: charts };
  } catch (err) {
    return { success: false, error: getErrorMessage(err), code: "INTERNAL_ERROR" };
  }
}

// ─────────────────────────────────────────────
// School Billing Actions
// ─────────────────────────────────────────────

export async function updateSchoolPrice(
  schoolId: string,
  pricePerStudent: number
): Promise<ActionResult> {
  try {
    const validated = UpdatePriceSchema.parse({ schoolId, pricePerStudent });
    const supabase = await createSupabaseServer() as any;
    const admin = createSupabaseAdmin() as any;

    // Verify user is super_admin
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      return { success: false, error: "Unauthorized", code: "UNAUTHORIZED" };
    }

    const { data: profile } = await supabase
    .from("users")
      .select("role")
      .eq("id", user.user.id)
      .single();

    if (profile?.role !== "super_admin") {
      return { success: false, error: "Only Super Admin can update prices", code: "FORBIDDEN" };
    }

    // Update the school billing record
    const { error } = await admin
    .from("school_billing")
      .update({ price_per_student: validated.pricePerStudent })
      .eq("school_id", validated.schoolId);

    if (error) {
      return { success: false, error: error.message, code: "DB_ERROR" };
    }

    return { success: true, data: undefined };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { success: false, error: "Invalid input data", code: "VALIDATION_ERROR" };
    }
    return { success: false, error: getErrorMessage(err), code: "INTERNAL_ERROR" };
  }
}

export async function sendInvoiceToSchool(
  schoolId: string,
  billingPeriod: string
): Promise<ActionResult<{ invoiceId: string; recipientCount: number }>> {
  try {
    const validated = SendInvoiceSchema.parse({ schoolId, billingPeriod });
    const supabase = await createSupabaseServer() as any;
    const admin = createSupabaseAdmin() as any;

    // Verify user is super_admin
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      return { success: false, error: "Unauthorized", code: "UNAUTHORIZED" };
    }

    const { data: profile } = await supabase
    .from("users")
      .select("role, name")
      .eq("id", user.user.id)
      .single();

    if (profile?.role !== "super_admin") {
      return { success: false, error: "Only Super Admin can send invoices", code: "FORBIDDEN" };
    }

    // Get school and principal info
    const { data: school } = await admin
    .from("schools")
      .select(`
        id,
        name,
        school_billing (
          price_per_student,
          monthly_ai_cost,
          monthly_infra_cost
        ),
        school_metrics (
          student_count
        )
      `)
      .eq("id", validated.schoolId)
      .single();

    if (!school) {
      return { success: false, error: "School not found", code: "NOT_FOUND" };
    }

    const billing = (school.school_billing as Record<string, unknown>) || {};
    const metrics = (school.school_metrics as Record<string, unknown>) || {};

    const studentCount = (metrics.student_count as number) || 0;
    const pricePerStudent = (billing.price_per_student as number) || 0;
    const totalAmount = pricePerStudent * studentCount;

    // Create invoice record
    const { data: invoice, error: invoiceError } = await admin
    .from("invoices")
      .insert({
        school_id: validated.schoolId,
        billing_period: validated.billingPeriod,
        student_count: studentCount,
        price_per_student: pricePerStudent,
        total_amount: totalAmount,
        // AI cost is internal only - not included in invoice
        created_by: user.user.id,
        status: "pending",
      })
      .select("id")
      .single();

    if (invoiceError) {
      return { success: false, error: invoiceError.message, code: "DB_ERROR" };
    }

    // Get principal email
    const { data: principal } = await admin
    .from("users")
      .select("id, email, name")
      .eq("school_id", validated.schoolId)
      .eq("role", "principal")
      .single();

    // Create notification for principal
    if (principal) {
      await admin.from("notifications").insert({
        sender_id: user.user.id,
        sender_role: "super_admin",
        school_id: validated.schoolId,
        recipient_id: principal.id,
        title: `Invoice ${validated.billingPeriod}`,
        body: `Dear ${principal.name}, your invoice for ${validated.billingPeriod} is ready. Amount: ${formatCurrency(totalAmount)}. Please process the payment at your earliest convenience.`,
        type: "billing",
        priority: "high",
        status: "sent",
        delivered_count: 1,
      });
    }

    return {
      success: true,
      data: {
        invoiceId: (invoice as { id: string }).id,
        recipientCount: principal ? 1 : 0,
      },
    };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { success: false, error: "Invalid input data", code: "VALIDATION_ERROR" };
    }
    return { success: false, error: getErrorMessage(err), code: "INTERNAL_ERROR" };
  }
}

export async function markInvoicePaid(invoiceId: string): Promise<ActionResult> {
  try {
    const supabase = await createSupabaseServer() as any;
    const admin = createSupabaseAdmin() as any;

    // Verify user is super_admin
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      return { success: false, error: "Unauthorized", code: "UNAUTHORIZED" };
    }

    const { error } = await admin
    .from("invoices")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
      })
      .eq("id", invoiceId);

    if (error) {
      return { success: false, error: error.message, code: "DB_ERROR" };
    }

    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: getErrorMessage(err), code: "INTERNAL_ERROR" };
  }
}

export async function freezeSchoolBilling(schoolId: string): Promise<ActionResult> {
  try {
    const supabase = await createSupabaseServer() as any;
    const admin = createSupabaseAdmin() as any;

    // Verify user is super_admin
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      return { success: false, error: "Unauthorized", code: "UNAUTHORIZED" };
    }

    const { data: profile } = await supabase
    .from("users")
      .select("role")
      .eq("id", user.user.id)
      .single();

    if (profile?.role !== "super_admin") {
      return { success: false, error: "Only Super Admin can freeze billing", code: "FORBIDDEN" };
    }

    // Update school status to frozen
    const { error } = await admin
    .from("schools")
      .update({ status: "frozen" })
      .eq("id", schoolId);

    if (error) {
      return { success: false, error: error.message, code: "DB_ERROR" };
    }

    // Create audit log
    await admin.from("billing_audit_log").insert({
      school_id: schoolId,
      action: "frozen",
      performed_by: user.user.id,
      ip_address: getClientIp(),
    });

    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: getErrorMessage(err), code: "INTERNAL_ERROR" };
  }
}

export async function unfreezeSchoolBilling(schoolId: string): Promise<ActionResult> {
  try {
    const supabase = await createSupabaseServer() as any;
    const admin = createSupabaseAdmin() as any;

    // Verify user is super_admin
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      return { success: false, error: "Unauthorized", code: "UNAUTHORIZED" };
    }

    const { data: profile } = await supabase
    .from("users")
      .select("role")
      .eq("id", user.user.id)
      .single();

    if (profile?.role !== "super_admin") {
      return { success: false, error: "Only Super Admin can unfreeze billing", code: "FORBIDDEN" };
    }

    // Update school status to active
    const { error } = await admin
    .from("schools")
      .update({ status: "active" })
      .eq("id", schoolId);

    if (error) {
      return { success: false, error: error.message, code: "DB_ERROR" };
    }

    // Create audit log
    await admin.from("billing_audit_log").insert({
      school_id: schoolId,
      action: "unfrozen",
      performed_by: user.user.id,
      ip_address: getClientIp(),
    });

    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: getErrorMessage(err), code: "INTERNAL_ERROR" };
  }
}

// ─────────────────────────────────────────────
// AI Cost Monitor Actions (Internal Only)
// ─────────────────────────────────────────────

export async function getAICostAnalytics(dateFrom: string, dateTo: string): Promise<ActionResult<CostAnalytics>> {
  try {
    const supabase = await createSupabaseServer() as any;

    // Verify user is super_admin
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      return { success: false, error: "Unauthorized", code: "UNAUTHORIZED" };
    }

    const { data: profile } = await supabase
    .from("users")
      .select("role")
      .eq("id", user.user.id)
      .single();

    if (profile?.role !== "super_admin") {
      return { success: false, error: "AI Cost data is only available to Super Admin", code: "FORBIDDEN" };
    }

    const { data: logs, error } = await supabase
    .from("ai_request_log")
      .select("*")
      .gte("created_at", dateFrom)
      .lte("created_at", dateTo);

    if (error) {
      return { success: false, error: error.message, code: "DB_ERROR" };
    }

    // Aggregate costs
    const costBySchool: Record<string, AICostData> = {};
    const costByModel: Record<string, number> = {};
    const costByGradeTier: Record<string, number> = {};
    const trend: Record<string, CostTrend> = {};
    let totalSpend = 0;
    let totalQueries = 0;

    for (const log of logs || []) {
      const schoolId = log.school_id as string;
      const model = (log.model_used as string) || "unknown";
      const gradeTier = (log.grade_tier as string) || "unknown";
      const cost = (log.cost_inr as number) || 0;
      const date = (log.created_at as string).split("T")[0];

      totalSpend += cost;
      totalQueries++;

      // Aggregate by school
      if (!costBySchool[schoolId]) {
        costBySchool[schoolId] = {
          schoolId,
          schoolName: "Loading...",
          totalCost: 0,
          geminiCost: 0,
          claudeHaikuCost: 0,
          claudeSonnetCost: 0,
          queryCount: 0,
          costPerQuery: 0,
          budgetLimit: null,
          budgetUsed: 0,
          budgetRemaining: 0,
        };
      }
      costBySchool[schoolId].totalCost += cost;
      costBySchool[schoolId].queryCount++;

      if (model.includes("gemini")) {costBySchool[schoolId].geminiCost += cost;}
      else if (model.includes("haiku")) {costBySchool[schoolId].claudeHaikuCost += cost;}
      else if (model.includes("sonnet")) {costBySchool[schoolId].claudeSonnetCost += cost;}

      // Aggregate by model
      costByModel[model] = (costByModel[model] || 0) + cost;

      // Aggregate by grade tier
      costByGradeTier[gradeTier] = (costByGradeTier[gradeTier] || 0) + cost;

      // Aggregate by date for trend
      if (!trend[date]) {
        trend[date] = {
          date,
          totalCost: 0,
          geminiCost: 0,
          claudeHaikuCost: 0,
          claudeSonnetCost: 0,
          queryCount: 0,
        };
      }
      trend[date].totalCost += cost;
      trend[date].queryCount++;
      if (model.includes("gemini")) {trend[date].geminiCost += cost;}
      else if (model.includes("haiku")) {trend[date].claudeHaikuCost += cost;}
      else if (model.includes("sonnet")) {trend[date].claudeSonnetCost += cost;}
    }

    // Get school names
    const schoolIds = Object.keys(costBySchool);
    if (schoolIds.length > 0) {
      const { data: schools } = await supabase
      .from("schools")
        .select("id, name")
        .in("id", schoolIds);

      for (const school of schools || []) {
        if (costBySchool[school.id]) {
          costBySchool[school.id].schoolName = school.name;
        }
      }
    }

    // Get budget info
    if (schoolIds.length > 0) {
      const { data: budgets } = await supabase
      .from("school_ai_budget")
        .select("school_id, monthly_budget, current_spend")
        .in("school_id", schoolIds);

      for (const budget of budgets || []) {
        const schoolData = costBySchool[(budget as { school_id: string }).school_id];
        if (schoolData) {
          schoolData.budgetLimit = (budget as { monthly_budget: number }).monthly_budget;
          schoolData.budgetUsed = (budget as { current_spend: number }).current_spend;
          schoolData.budgetRemaining = schoolData.budgetLimit - schoolData.budgetUsed;
        }
      }
    }

    // Calculate cost per query
    for (const school of Object.values(costBySchool)) {
      school.costPerQuery = school.queryCount > 0 ? school.totalCost / school.queryCount : 0;
    }

    // Calculate cache savings (assuming 30% cache hit rate for demo)
    const cacheSavings = totalSpend * 0.3;

    // Sort schools by cost and get top 10
    const topSchools = Object.values(costBySchool)
      .sort((a, b) => b.totalCost - a.totalCost)
      .slice(0, 10);

    return {
      success: true,
      data: {
        totalSpend: Math.round(totalSpend * 10000) / 10000,
        monthlySpend: totalSpend, // Already filtered by date range
        dailySpend: totalSpend / 30,
        cacheSavings: Math.round(cacheSavings * 10000) / 10000,
        avgCostPerQuery: totalQueries > 0 ? totalSpend / totalQueries : 0,
        topSchools,
        trend: Object.values(trend).sort((a, b) => a.date.localeCompare(b.date)),
        byModel: costByModel,
        byGradeTier: costByGradeTier,
      },
    };
  } catch (err) {
    return { success: false, error: getErrorMessage(err), code: "INTERNAL_ERROR" };
  }
}

// ─────────────────────────────────────────────
// Pricing Actions
// ─────────────────────────────────────────────

export async function getPlatformPricing(): Promise<ActionResult<PlatformPricing>> {
  try {
    const supabase = await createSupabaseServer() as any;

    const { data: settings, error } = await supabase
    .from("platform_settings")
      .select("*")
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows returned
      return { success: false, error: error.message, code: "DB_ERROR" };
    }

    const defaultPrice = (settings?.default_price_per_student as number) || 100;
    const infraCost = (settings?.infra_cost_per_school as number) || 350;
    const billingCycle = (settings?.billing_cycle as "monthly" | "annual") || "monthly";

    // Get tier distribution
    const { data: schools } = await supabase
    .from("school_billing")
      .select(`
        price_per_student,
        schools (
          id
        )
      `);

    const tiers: Record<string, { count: number; revenue: number }> = {
      economy: { count: 0, revenue: 0 },
      standard: { count: 0, revenue: 0 },
      premium: { count: 0, revenue: 0 },
    };

    for (const record of schools || []) {
      const price = (record.price_per_student as number) || defaultPrice;
      const studentCount = 30; // Default for calculation

      if (price < 50) {
        tiers.economy.count++;
        tiers.economy.revenue += price * studentCount;
      } else if (price <= 150) {
        tiers.standard.count++;
        tiers.standard.revenue += price * studentCount;
      } else {
        tiers.premium.count++;
        tiers.premium.revenue += price * studentCount;
      }
    }

    return {
      success: true,
      data: {
        defaultPricePerStudent: defaultPrice,
        infraCostPerSchool: infraCost,
        billingCycle,
        minStudents: 1,
        tiers: [
          { name: "Economy", minPrice: 0, maxPrice: 50, schoolCount: tiers.economy.count, revenue: tiers.economy.revenue },
          { name: "Standard", minPrice: 50, maxPrice: 150, schoolCount: tiers.standard.count, revenue: tiers.standard.revenue },
          { name: "Premium", minPrice: 150, maxPrice: Infinity, schoolCount: tiers.premium.count, revenue: tiers.premium.revenue },
        ],
      },
    };
  } catch (err) {
    return { success: false, error: getErrorMessage(err), code: "INTERNAL_ERROR" };
  }
}

export async function updatePlatformPricing(
  data: z.infer<typeof UpdatePricingSchema>
): Promise<ActionResult> {
  try {
    const validated = UpdatePricingSchema.parse(data);
    const supabase = await createSupabaseServer() as any;
    const admin = createSupabaseAdmin() as any;

    // Verify user is super_admin
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      return { success: false, error: "Unauthorized", code: "UNAUTHORIZED" };
    }

    const { data: profile } = await supabase
    .from("users")
      .select("role")
      .eq("id", user.user.id)
      .single();

    if (profile?.role !== "super_admin") {
      return { success: false, error: "Only Super Admin can update pricing", code: "FORBIDDEN" };
    }

    // Upsert platform settings
    const { error } = await admin
    .from("platform_settings")
      .upsert({
        id: 1, // Singleton record
        default_price_per_student: validated.defaultPricePerStudent,
        infra_cost_per_school: validated.infraCostPerSchool,
        billing_cycle: validated.billingCycle,
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" });

    if (error) {
      return { success: false, error: error.message, code: "DB_ERROR" };
    }

    return { success: true, data: undefined };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { success: false, error: "Invalid input data", code: "VALIDATION_ERROR" };
    }
    return { success: false, error: getErrorMessage(err), code: "INTERNAL_ERROR" };
  }
}

// ─────────────────────────────────────────────
// Renewal Pipeline
// ─────────────────────────────────────────────

export interface RenewalItem {
  schoolId: string;
  schoolName: string;
  renewalDate: string;
  daysUntilRenewal: number;
  studentCount: number;
  monthlyRevenue: number;
  tier: "30_days" | "60_days" | "90_days";
}

export async function getRenewalPipeline(): Promise<ActionResult<RenewalItem[]>> {
  try {
    const supabase = await createSupabaseServer() as any;

    const { data: schools, error } = await supabase
    .from("schools")
      .select(`
        id,
        name,
        school_billing (
          next_billing_date,
          price_per_student
        ),
        school_metrics (
          student_count
        )
      `)
      .eq("status", "active")
      .not("deleted_at", "is", null);

    if (error) {
      return { success: false, error: error.message, code: "DB_ERROR" };
    }

    const now = new Date();
    const renewalItems: RenewalItem[] = [];

    for (const school of schools || []) {
      const billing = (school.school_billing as Record<string, unknown>) || {};
      const metrics = (school.school_metrics as Record<string, unknown>) || {};

      const nextBilling = (billing.next_billing_date as string) || "";
      if (!nextBilling) {continue;}

      const renewalDate = new Date(nextBilling);
      const daysUntilRenewal = Math.ceil((renewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntilRenewal <= 90 && daysUntilRenewal > 0) {
        let tier: "30_days" | "60_days" | "90_days" = "90_days";
        if (daysUntilRenewal <= 30) {tier = "30_days";}
        else if (daysUntilRenewal <= 60) {tier = "60_days";}

        const studentCount = (metrics.student_count as number) || 0;
        const pricePerStudent = (billing.price_per_student as number) || 0;

        renewalItems.push({
          schoolId: school.id,
          schoolName: school.name,
          renewalDate: nextBilling,
          daysUntilRenewal,
          studentCount,
          monthlyRevenue: pricePerStudent * studentCount,
          tier,
        });
      }
    }

    // Sort by renewal date
    renewalItems.sort((a, b) => a.daysUntilRenewal - b.daysUntilRenewal);

    return { success: true, data: renewalItems };
  } catch (err) {
    return { success: false, error: getErrorMessage(err), code: "INTERNAL_ERROR" };
  }
}
