/**
 * Metrics Grid Component
 * Displays 9 sections of detailed metrics in a collapsible grid layout.
 */

import { CommandCenterData } from "@/lib/actions/super-admin/command-center";
import { formatINR, formatINRDecimal, formatIndianNumber } from "@/lib/utils";
import { MetricsSection } from "./metrics-section";

interface MetricsGridProps {
  data: CommandCenterData;
}

export function MetricsGrid({ data }: MetricsGridProps) {
  return (
    <div className="space-y-6">
      {/* A. Platform Overview */}
      <MetricsSection
        title="Platform Overview"
        icon={
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        }
      >
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <MetricItem
            label="Total Active Schools"
            value={formatIndianNumber(data.platform.totalActiveSchools)}
          />
          <MetricItem
            label="Total Students"
            value={formatIndianNumber(data.platform.totalStudents)}
          />
          <MetricItem
            label="Monthly Recurring Revenue"
            value={formatINR(data.platform.monthlyRecurringRevenue)}
          />
          <MetricItem
            label="Daily Active Users"
            value={formatIndianNumber(data.platform.dailyActiveUsers)}
          />
          <MetricItem
            label="AI Queries (Today)"
            value={formatIndianNumber(data.platform.aiQueriesToday)}
          />
          <MetricItem
            label="AI Queries (Month)"
            value={formatIndianNumber(data.platform.aiQueriesMonth)}
          />
        </div>
      </MetricsSection>

      {/* B. Financial Metrics */}
      <MetricsSection
        title="Financial Metrics"
        icon={
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
      >
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <MetricItem
            label="Total AI Spend"
            value={formatINRDecimal(data.financial.totalAiSpend)}
            trend={data.financial.totalAiSpend > 50000 ? "warning" : "neutral"}
          />
          <MetricItem
            label="Revenue vs Cost"
            value={`${data.financial.revenueVsCost.margin.toFixed(1)}% margin`}
            trend={data.financial.revenueVsCost.margin > 50 ? "success" : "warning"}
          />
          <MetricItem
            label="Avg AI Cost/Student"
            value={formatINRDecimal(data.financial.avgAiCostPerStudent, 2)}
          />
          <MetricItem
            label="Revenue/School"
            value={formatINR(data.financial.revenuePerSchool)}
          />
          <MetricItem
            label="Budget Alerts"
            value={data.financial.budgetAlerts.toString()}
            trend={data.financial.budgetAlerts > 0 ? "warning" : "success"}
          />
          <MetricItem
            label="Renewals (30d)"
            value={data.financial.revenueForecasting.renewals30Days.toString()}
          />
        </div>

        {/* Top cost schools */}
        {data.financial.topCostSchools.length > 0 && (
          <div className="mt-4">
            <h4 className="mb-2 text-xs font-medium uppercase text-text-muted">Top 5 Cost Schools</h4>
            <div className="space-y-1">
              {data.financial.topCostSchools.map((school, idx) => (
                <div key={school.schoolId} className="flex items-center justify-between rounded bg-surface-2 px-3 py-2">
                  <span className="text-sm text-text-secondary">
                    <span className="mr-2 text-text-muted">{idx + 1}.</span>
                    {school.schoolName}
                  </span>
                  <span className="text-sm font-medium text-text-primary">
                    {formatINR(school.cost)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </MetricsSection>

      {/* C. Student Engagement */}
      <MetricsSection
        title="Student Engagement"
        icon={
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        }
      >
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <MetricItem
            label="Daily Active Students"
            value={formatIndianNumber(data.engagement.dailyActiveStudents)}
          />
          <MetricItem
            label="Weekly Active Students"
            value={formatIndianNumber(data.engagement.weeklyActiveStudents)}
          />
          <MetricItem
            label="DAU/MAU Ratio"
            value={`${(data.engagement.studentRetention.dauMau * 100).toFixed(1)}%`}
            trend={data.engagement.studentRetention.dauMau > 0.3 ? "success" : "warning"}
          />
          <MetricItem
            label="AI Interaction Rate"
            value={`${(data.engagement.aiInteractionRate * 100).toFixed(1)}%`}
          />
          <MetricItem
            label="Avg AI Queries/Student"
            value={data.engagement.avgAiQueriesPerActiveStudent.toFixed(1)}
          />
          <MetricItem
            label="Quiz Completion Rate"
            value={`${(data.engagement.quizCompletionRate * 100).toFixed(1)}%`}
          />
          <MetricItem
            label="Quiz Pass Rate"
            value={`${(data.engagement.quizPassRate * 100).toFixed(1)}%`}
            trend={data.engagement.quizPassRate > 0.7 ? "success" : data.engagement.quizPassRate < 0.5 ? "warning" : "neutral"}
          />
          <MetricItem
            label="Knowledge Gaps Found"
            value={formatIndianNumber(data.engagement.knowledgeGapsIdentified)}
          />
          <MetricItem
            label="At-Risk Students"
            value={formatIndianNumber(data.engagement.riskStudentCount)}
            trend={data.engagement.riskStudentCount > 5 ? "warning" : "success"}
          />
        </div>
      </MetricsSection>

      {/* D. AI System Performance */}
      <MetricsSection
        title="AI System Performance"
        icon={
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        }
      >
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <MetricItem
            label="Response P50"
            value={`${data.aiPerformance.responseTimeP50}ms`}
            trend={data.aiPerformance.responseTimeP50 < 500 ? "success" : "warning"}
          />
          <MetricItem
            label="Response P95"
            value={`${data.aiPerformance.responseTimeP95}ms`}
            trend={data.aiPerformance.responseTimeP95 < 1000 ? "success" : "warning"}
          />
          <MetricItem
            label="Response P99"
            value={`${data.aiPerformance.responseTimeP99}ms`}
            trend={data.aiPerformance.responseTimeP99 < 2000 ? "success" : "warning"}
          />
          <MetricItem
            label="Cache Hit Rate"
            value={`${(data.aiPerformance.cacheHitRate * 100).toFixed(1)}%`}
            trend={data.aiPerformance.cacheHitRate > 0.7 ? "success" : "warning"}
          />
          <MetricItem
            label="Pre-gen Hit Rate"
            value={`${(data.aiPerformance.preGenHitRate * 100).toFixed(1)}%`}
          />
          <MetricItem
            label="Failed AI Calls"
            value={formatIndianNumber(data.aiPerformance.failedAiCalls)}
            trend={data.aiPerformance.failedAiCalls > 0 ? "warning" : "success"}
          />
          <MetricItem
            label="Cost/1000 Queries"
            value={formatINRDecimal(data.aiPerformance.costPer1000Queries)}
          />
          <MetricItem
            label="Avg Time to First Query"
            value={`${(data.aiPerformance.avgTimeToFirstQuery / 1000).toFixed(1)}s`}
          />
        </div>

        {/* Model usage breakdown */}
        {data.aiPerformance.modelUsage.length > 0 && (
          <div className="mt-4">
            <h4 className="mb-2 text-xs font-medium uppercase text-text-muted">Model Usage</h4>
            <div className="flex flex-wrap gap-2">
              {data.aiPerformance.modelUsage.map((model) => (
                <span
                  key={model.model}
                  className="inline-flex items-center rounded-full bg-surface-2 px-3 py-1 text-xs"
                >
                  <span className="mr-2 text-text-muted">{model.model}</span>
                  <span className="font-medium text-text-primary">{model.queries.toLocaleString()}</span>
                  <span className="ml-1 text-text-muted">({model.percentage.toFixed(1)}%)</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </MetricsSection>

      {/* E. Content Pipeline */}
      <MetricsSection
        title="Content Pipeline"
        icon={
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        }
      >
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <MetricItem
            label="Pending"
            value={data.contentPipeline.booksPending.toString()}
            trend={data.contentPipeline.booksPending > 10 ? "warning" : "neutral"}
          />
          <MetricItem
            label="Processing"
            value={data.contentPipeline.booksProcessing.toString()}
          />
          <MetricItem
            label="Ready"
            value={data.contentPipeline.booksReady.toString()}
            trend={data.contentPipeline.booksReady > 0 ? "success" : "neutral"}
          />
          <MetricItem
            label="Failed"
            value={data.contentPipeline.booksFailed.toString()}
            trend={data.contentPipeline.booksFailed > 0 ? "warning" : "success"}
          />
          <MetricItem
            label="Pre-gen Coverage"
            value={`${data.contentPipeline.preGenCoverage.toFixed(1)}%`}
            trend={data.contentPipeline.preGenCoverage > 70 ? "success" : "warning"}
          />
          <MetricItem
            label="Schools &lt;50% Coverage"
            value={data.contentPipeline.schoolsBelow50Coverage.toString()}
            trend={data.contentPipeline.schoolsBelow50Coverage > 0 ? "warning" : "success"}
          />
          <MetricItem
            label="Queue Depth"
            value={data.contentPipeline.queueDepth.toString()}
          />
        </div>

        {/* Recently added books */}
        {data.contentPipeline.recentlyAddedBooks.length > 0 && (
          <div className="mt-4">
            <h4 className="mb-2 text-xs font-medium uppercase text-text-muted">Recently Added</h4>
            <div className="space-y-1">
              {data.contentPipeline.recentlyAddedBooks.slice(0, 3).map((book) => (
                <div key={book.id} className="rounded bg-surface-2 px-3 py-2">
                  <p className="text-sm text-text-primary">{book.title}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </MetricsSection>

      {/* F. School Health */}
      <MetricsSection
        title="School Health &amp; Onboarding"
        icon={
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        }
      >
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <MetricItem
            label="New Schools (Month)"
            value={data.schoolHealth.newSchoolsThisMonth.toString()}
          />
          <MetricItem
            label="Schools at Risk"
            value={data.schoolHealth.schoolsAtRisk.toString()}
            trend={data.schoolHealth.schoolsAtRisk > 0 ? "warning" : "success"}
          />
          <MetricItem
            label="Expiring (30 days)"
            value={data.schoolHealth.schoolsExpiring30Days.toString()}
            trend={data.schoolHealth.schoolsExpiring30Days > 0 ? "warning" : "success"}
          />
          <MetricItem
            label="Trial Schools"
            value={data.schoolHealth.trialVsPaid.trial.toString()}
          />
          <MetricItem
            label="Paid Schools"
            value={data.schoolHealth.trialVsPaid.paid.toString()}
          />
          <MetricItem
            label="Teacher Onboarding"
            value={`${(data.schoolHealth.teacherOnboardingRate * 100).toFixed(1)}%`}
          />
          <MetricItem
            label="Teacher Activity"
            value={`${(data.schoolHealth.teacherActivityRate * 100).toFixed(1)}%`}
            trend={data.schoolHealth.teacherActivityRate > 0.5 ? "success" : "warning"}
          />
          <MetricItem
            label="Low Adoption Teachers"
            value={data.schoolHealth.teachersLowAdoption.toString()}
            trend={data.schoolHealth.teachersLowAdoption > 0 ? "warning" : "success"}
          />
        </div>
      </MetricsSection>

      {/* G. Notification System */}
      <MetricsSection
        title="Notification System"
        icon={
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        }
      >
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <MetricItem
            label="Sent Today"
            value={formatIndianNumber(data.notification.sentToday)}
          />
          <MetricItem
            label="Sent This Week"
            value={formatIndianNumber(data.notification.sentWeek)}
          />
          <MetricItem
            label="Delivery Rate"
            value={`${(data.notification.deliveryRate * 100).toFixed(1)}%`}
            trend={data.notification.deliveryRate > 0.95 ? "success" : "warning"}
          />
          <MetricItem
            label="Failure Rate"
            value={`${(data.notification.failureRate * 100).toFixed(2)}%`}
            trend={data.notification.failureRate < 0.01 ? "success" : "warning"}
          />
          <MetricItem
            label="Avg Rating"
            value={data.notification.avgRating.toFixed(1)}
            trend={data.notification.avgRating > 4 ? "success" : data.notification.avgRating < 3 ? "warning" : "neutral"}
          />
        </div>
      </MetricsSection>

      {/* H. System & Infrastructure */}
      <MetricsSection
        title="System &amp; Infrastructure"
        icon={
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
          </svg>
        }
      >
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <MetricItem
            label="API P95"
            value={`${data.systemHealth.apiResponseTimeP95}ms`}
            trend={data.systemHealth.apiResponseTimeP95 < 200 ? "success" : "warning"}
          />
          <MetricItem
            label="Error Rate"
            value={`${(data.systemHealth.errorRate * 100).toFixed(2)}%`}
            trend={data.systemHealth.errorRate < 0.01 ? "success" : "warning"}
          />
          <MetricItem
            label="DB Query Time"
            value={`${data.systemHealth.dbQueryTime}ms`}
            trend={data.systemHealth.dbQueryTime < 50 ? "success" : "warning"}
          />
          <MetricItem
            label="Auth Failure Rate"
            value={`${(data.systemHealth.authFailureRate * 100).toFixed(2)}%`}
            trend={data.systemHealth.authFailureRate < 0.05 ? "success" : "warning"}
          />
          <MetricItem
            label="Active Impersonations"
            value={data.systemHealth.activeImpersonationSessions.toString()}
            trend={data.systemHealth.activeImpersonationSessions > 0 ? "warning" : "success"}
          />
          <MetricItem
            label="Admin Actions"
            value={formatIndianNumber(data.systemHealth.recentAdminActions)}
          />
          <MetricItem
            label="Suspicious Access"
            value={data.systemHealth.suspiciousCrossSchoolAccess.toString()}
            trend={data.systemHealth.suspiciousCrossSchoolAccess > 0 ? "warning" : "success"}
          />
        </div>
      </MetricsSection>
    </div>
  );
}

interface MetricItemProps {
  label: string;
  value: string;
  trend?: "success" | "warning" | "neutral";
}

function MetricItem({ label, value, trend = "neutral" }: MetricItemProps) {
  const trendClass =
    trend === "success"
      ? "text-success"
      : trend === "warning"
        ? "text-warning"
        : "text-text-primary";

  return (
    <div className="rounded-lg bg-surface-2 p-3">
      <p className="text-xs text-text-muted">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${trendClass}`}>{value}</p>
    </div>
  );
}
