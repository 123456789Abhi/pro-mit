/**
 * KPI Cards Component
 * Primary platform metrics displayed as top-level summary cards.
 */

import { PlatformMetrics } from "@/lib/actions/super-admin/command-center";
import { formatINR, formatIndianNumber } from "@/lib/utils";

interface KPICardsProps {
  data: PlatformMetrics;
  wowGrowth: {
    schools: number;
    students: number;
    revenue: number;
  };
}

function formatPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function formatGrowthLabel(value: number): { text: string; className: string } {
  const formatted = formatPercent(value);
  if (value > 0) {
    return { text: formatted, className: "text-success" };
  }
  if (value < 0) {
    return { text: formatted, className: "text-danger" };
  }
  return { text: "No change", className: "text-text-secondary" };
}

export function KPICards({ data, wowGrowth }: KPICardsProps) {
  const cards = [
    {
      label: "Active Schools",
      value: formatIndianNumber(data.totalActiveSchools),
      growth: wowGrowth.schools,
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
    },
    {
      label: "Total Students",
      value: formatIndianNumber(data.totalStudents),
      growth: wowGrowth.students,
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      label: "Monthly Revenue",
      value: formatINR(data.monthlyRecurringRevenue),
      growth: wowGrowth.revenue,
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: "Daily Active Users",
      value: formatIndianNumber(data.dailyActiveUsers),
      growth: null,
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      label: "AI Queries Today",
      value: formatIndianNumber(data.aiQueriesToday),
      growth: null,
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
    },
    {
      label: "Platform Uptime",
      value: `${data.platformUptime.toFixed(2)}%`,
      growth: null,
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      highlight: data.platformUptime < 99.5 ? "warning" : "success",
    },
  ];

  return (
    <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      {cards.map((card) => {
        const growthInfo = card.growth !== null ? formatGrowthLabel(card.growth) : null;
        const highlightClass =
          card.highlight === "warning"
            ? "border-warning/50"
            : card.highlight === "success"
              ? "border-success/50"
              : "";

        return (
          <div
            key={card.label}
            className={`rounded-xl border border-border bg-surface-1 p-4 transition-colors hover:border-border-hover ${highlightClass}`}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
                {card.label}
              </span>
              <span className="text-text-secondary">{card.icon}</span>
            </div>
            <p className="text-2xl font-bold text-text-primary">{card.value}</p>
            {growthInfo && (
              <p className={`mt-1 text-xs font-medium ${growthInfo.className}`}>
                {growthInfo.text} WoW
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
